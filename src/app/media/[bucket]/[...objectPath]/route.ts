import { NextResponse } from "next/server";

import { SUPABASE_URL } from "@/libs/env";
import { normalizeSupabaseOrigin } from "@/libs/rich-content/image";
import { parseSupabasePublicMediaUrl } from "@/libs/media/media-url";

type RouteContext = {
  params: Promise<{ bucket: string; objectPath: string[] }>;
};

const UPSTREAM_TIMEOUT_MS = 10_000;
const SUCCESS_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";
const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function invalidMediaResponse(status = 404) {
  return new NextResponse(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function buildUpstreamUrl(bucket: string, objectPath: string[]): string | null {
  const origin = normalizeSupabaseOrigin(SUPABASE_URL);
  if (!origin || objectPath.length === 0) return null;

  const candidate = `${origin}/storage/v1/object/public/${bucket}/${objectPath
    .map(encodeURIComponent)
    .join("/")}`;
  return parseSupabasePublicMediaUrl(candidate, origin) ? candidate : null;
}

async function proxyMedia(request: Request, context: RouteContext): Promise<Response> {
  const url = new URL(request.url);
  // Fragment 不會送到 Server；Query 不是媒體路由契約的一部分，因此拒絕以避免快取鍵與來源意義分歧。
  if (url.search) return invalidMediaResponse(400);

  const { bucket, objectPath } = await context.params;
  const upstreamUrl = buildUpstreamUrl(bucket, objectPath);
  if (!upstreamUrl) return invalidMediaResponse();

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      redirect: "error",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (upstream.status === 404) return invalidMediaResponse(404);
    if (!upstream.ok) return invalidMediaResponse(502);

    const contentType = upstream.headers.get("content-type");
    const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
    if (!mediaType || !ALLOWED_IMAGE_CONTENT_TYPES.has(mediaType)) {
      return invalidMediaResponse(502);
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType!);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength && /^\d+$/.test(contentLength)) {
      headers.set("Content-Length", contentLength);
    }
    headers.set("Cache-Control", SUCCESS_CACHE_CONTROL);

    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: 200,
      headers,
    });
  } catch {
    return invalidMediaResponse(502);
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxyMedia(request, context);
}

export async function HEAD(request: Request, context: RouteContext) {
  return proxyMedia(request, context);
}

export function POST() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
  });
}
