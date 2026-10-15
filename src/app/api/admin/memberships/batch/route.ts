import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import {
  MembershipBatchConflictError,
  MembershipStatusTransitionError,
} from "@/services/memberships/memberships.errors";
import { membershipService } from "@/services/memberships/memberships.service";

export async function PATCH(request: Request) {
  try {
    const authorization = await authorizeAdminRequest("沒有社員資格管理權限");
    if (authorization.response) return authorization.response;

    try {
      const data = await membershipService.bulkUpdateStatusForAdmin(
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
      if (
        error instanceof MembershipBatchConflictError ||
        error instanceof MembershipStatusTransitionError
      ) {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }
      return unexpectedErrorResponse(
        "[PATCH /api/admin/memberships/batch]",
        error,
        "批次更新社員資格失敗，請稍後再試",
      );
    }
  } catch (error) {
    return unexpectedErrorResponse(
      "[PATCH /api/admin/memberships/batch]",
      error,
      "無法確認社員資格管理權限，請稍後再試",
    );
  }
}
