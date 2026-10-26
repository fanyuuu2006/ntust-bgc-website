import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { EventAlreadyCancelledError, EventCheckInWindowError, EventHasAttendanceRecordsError, EventNotCancelledError, EventNotFoundError } from "@/services/events/events.errors";
import { eventsService } from "@/services/events/events.service";
import { eventActionSchema } from "@/services/events/events.schema";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;
  try {
    const { id } = await params;
    const body = await request.json();
    if (body && typeof body === "object" && "action" in body) {
      const action = eventActionSchema.parse(body).action;
      const data = action === "cancel"
        ? await eventsService.cancelEvent(id)
        : await eventsService.restoreEvent(id);
      return NextResponse.json({ data });
    }
    return NextResponse.json({ data: await eventsService.updateEvent(id, body) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "輸入資料格式不正確", errors: z.flattenError(error).fieldErrors }, { status: 400 });
    }
    if (error instanceof EventCheckInWindowError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof EventAlreadyCancelledError || error instanceof EventNotCancelledError) return NextResponse.json({ message: error.message }, { status: 409 });
    if (error instanceof EventNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
    return unexpectedErrorResponse("[PATCH /api/admin/events/[id]]", error, "更新活動失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[PATCH /api/admin/events/[id]]", error, "操作暫時無法完成，請稍後再試。");
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;
  try {
    const { id } = await params;
    await eventsService.deleteEvent(id);
    return NextResponse.json({ data: null });
  } catch (error) {
    if (error instanceof EventNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
    if (error instanceof EventHasAttendanceRecordsError) return NextResponse.json({ message: error.message }, { status: 409 });
    return unexpectedErrorResponse("[DELETE /api/admin/events/[id]]", error, "刪除活動失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[DELETE /api/admin/events/[id]]", error, "操作暫時無法完成，請稍後再試。");
  }
}
