import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { EventCheckInWindowError, EventHasAttendanceRecordsError, EventNotFoundError } from "@/services/events/events.errors";
import { eventsService } from "@/services/events/events.service";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

async function requireAdmin() {
  const user = await getCurrentUser();
  return user && await isAdminByUserId(user.id);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });
  try {
    const { id } = await params;
    return NextResponse.json({ data: await eventsService.updateEvent(id, await request.json()) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "輸入資料格式不正確", errors: z.flattenError(error).fieldErrors }, { status: 400 });
    }
    if (error instanceof EventCheckInWindowError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof EventNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
    return unexpectedErrorResponse("[PATCH /api/admin/events/[id]]", error, "更新活動失敗，請稍後再試");
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });
  try {
    const { id } = await params;
    await eventsService.deleteEvent(id);
    return NextResponse.json({ data: null });
  } catch (error) {
    if (error instanceof EventNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
    if (error instanceof EventHasAttendanceRecordsError) return NextResponse.json({ message: error.message }, { status: 409 });
    return unexpectedErrorResponse("[DELETE /api/admin/events/[id]]", error, "刪除活動失敗，請稍後再試");
  }
}
