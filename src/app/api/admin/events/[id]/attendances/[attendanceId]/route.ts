import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { parsePositiveIntegerId } from "@/libs/zod/ids";
import { AttendanceNotFoundError } from "@/services/events/events.errors";
import { eventsService } from "@/services/events/events.service";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; attendanceId: string }> },
) {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;

  try {
    const { id, attendanceId: rawAttendanceId } = await params;
    const attendanceId = parsePositiveIntegerId(rawAttendanceId);
    return NextResponse.json({
      data: await eventsService.updateAttendanceForAdmin(id, attendanceId, await request.json()),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof AttendanceNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return unexpectedErrorResponse("[PATCH /api/admin/events/[id]/attendances/[attendanceId]]", error, "更新簽到失敗，請稍後再試");
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; attendanceId: string }> },
) {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;

  try {
    const { id, attendanceId: rawAttendanceId } = await params;
    const attendanceId = parsePositiveIntegerId(rawAttendanceId);
    await eventsService.deleteAttendanceForAdmin(id, attendanceId);
    return NextResponse.json({ data: null });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 });
    }
    if (error instanceof AttendanceNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    return unexpectedErrorResponse("[DELETE /api/admin/events/[id]/attendances/[attendanceId]]", error, "刪除簽到失敗，請稍後再試");
  }
}
