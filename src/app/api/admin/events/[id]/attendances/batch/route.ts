import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { AttendanceBatchConflictError } from "@/services/events/events.errors";
import { eventsService } from "@/services/events/events.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authorization = await authorizeAdminRequest("沒有管理權限");
    if (authorization.response) return authorization.response;

    try {
      const { id } = await params;
      const data = await eventsService.bulkUpdateAttendancesForAdmin(
        id,
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
      if (error instanceof AttendanceBatchConflictError) {
        return NextResponse.json({ message: error.message }, { status: 409 });
      }
      return unexpectedErrorResponse(
        "[PATCH /api/admin/events/[id]/attendances/batch]",
        error,
        "批次更新簽到紀錄失敗，請稍後再試",
      );
    }
  } catch (error) {
    return unexpectedErrorResponse(
      "[PATCH /api/admin/events/[id]/attendances/batch]",
      error,
      "無法確認管理權限，請稍後再試",
    );
  }
}
