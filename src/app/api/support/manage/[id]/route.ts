import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { authorizeSupportManagerRequest } from "@/libs/api/support-manager-authorization";
import { rejectUnsafeSupportMutation } from "@/libs/api/support-manager-mutation";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { SupportRecordStateError } from "@/services/support/support.errors";
import { supportService } from "@/services/support/support.service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const authorization = await authorizeSupportManagerRequest();
  if (authorization.response) return authorization.response;
  const unsafe = rejectUnsafeSupportMutation(request);
  if (unsafe) return unsafe;
  try {
    const { id } = await context.params;
    const record = await supportService.update(id, await request.json());
    return NextResponse.json({ data: record }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "請檢查公開設定", errors: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof SupportRecordStateError) {
      return NextResponse.json({ message: "找不到可執行此操作的支持紀錄" }, { status: 409 });
    }
    return unexpectedErrorResponse("[PATCH /api/support/manage/:id]", error, "更新支持紀錄失敗，請稍後再試");
  }
}
