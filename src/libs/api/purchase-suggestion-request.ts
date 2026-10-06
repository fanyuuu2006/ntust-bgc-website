import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { PurchaseSuggestionError } from "@/services/purchase-suggestions/purchase-suggestions.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

const MAX_BODY_BYTES = 16 * 1024;
export function rejectUnsafePurchaseSuggestionRequest(request: NextRequest) {
  // NextURL normalizes loopback hosts to localhost. Compare the actual Host;
  // never accept an arbitrary forwarded host as an additional trusted origin.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  const expectedOrigin = `${request.nextUrl.protocol}//${host}`;
  if (request.headers.get("origin") !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ message: "無法確認請求來源" }, { status: 403 });
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ message: "請使用 JSON 格式" }, { status: 415 });
  }
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "請求內容過大" }, { status: 413 });
  }
  return null;
}

export class PurchaseRequestBodyError extends Error {
  constructor(public readonly status: 400 | 413) { super(status === 413 ? "請求內容過大" : "請求格式錯誤"); }
}

/** Count actual bytes before decoding/parsing, including chunked requests. */
export async function readPurchaseSuggestionBody(request: Request): Promise<unknown> {
  if (!request.body) throw new PurchaseRequestBodyError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new PurchaseRequestBodyError(413);
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
  } catch (error) {
    if (error instanceof PurchaseRequestBodyError) throw error;
    throw new PurchaseRequestBodyError(400);
  } finally { reader.releaseLock(); }
}

export function purchaseSuggestionErrorResponse(error: unknown, context: string) {
  if (error instanceof PurchaseRequestBodyError) return NextResponse.json({ message: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ message: "請檢查輸入內容", errors: z.flattenError(error).fieldErrors }, { status: 400 });
  if (error instanceof PurchaseSuggestionError) return NextResponse.json({ message: error.message }, {
    status: error.status,
    ...(error.retryAfter ? { headers: { "Retry-After": String(error.retryAfter) } } : {}),
  });
  return unexpectedErrorResponse(context, error, "推薦功能暫時無法使用，請稍後再試");
}
