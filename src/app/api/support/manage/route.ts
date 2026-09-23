import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { authorizeSupportManagerRequest } from "@/libs/api/support-manager-authorization";
import { rejectUnsafeSupportMutation } from "@/libs/api/support-manager-mutation";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { DuplicateSupportReferenceError } from "@/services/support/support.errors";
import { supportService } from "@/services/support/support.service";

export async function GET() {
  const authorization = await authorizeSupportManagerRequest();
  if (authorization.response) return authorization.response;
  try {
    const records = await supportService.listPrivate();
    return NextResponse.json({ data: records }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return unexpectedErrorResponse("[GET /api/support/manage]", error, "讀取支持紀錄失敗，請稍後再試");
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeSupportManagerRequest();
  if (authorization.response) return authorization.response;
  const unsafe = rejectUnsafeSupportMutation(request);
  if (unsafe) return unsafe;
  try {
    const record = await supportService.createVerified(await request.json());
    return NextResponse.json({ data: record }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "請檢查支持紀錄欄位", errors: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof DuplicateSupportReferenceError) {
      return NextResponse.json({ message: "這筆平台交易已紀錄" }, { status: 409 });
    }
    return unexpectedErrorResponse("[POST /api/support/manage]", error, "新增支持紀錄失敗，請稍後再試");
  }
}
