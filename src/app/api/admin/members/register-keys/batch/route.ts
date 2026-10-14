import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { MembershipRegisterKeysBatchConflictError } from "@/services/memberships/memberships.errors";
import { membershipService } from "@/services/memberships/memberships.service";

export async function PATCH(request: Request) {
  try {
    const authorization = await authorizeAdminRequest(
      "您沒有管理社員註冊序號的權限",
    );
    if (authorization.response) return authorization.response;

    try {
      const data = await membershipService.bulkRevokeRegisterKeys(
        await request.json(),
      );
      return NextResponse.json({ data });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
          { status: 400 },
        );
      }
      if (error instanceof MembershipRegisterKeysBatchConflictError) {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }
      return unexpectedErrorResponse(
        "[PATCH /api/admin/members/register-keys/batch]",
        error,
        "批次撤銷社員註冊序號失敗，請稍後再試",
      );
    }
  } catch (error) {
    return unexpectedErrorResponse(
      "[PATCH /api/admin/members/register-keys/batch]",
      error,
      "操作暫時無法完成，請稍後再試。",
    );
  }
}
