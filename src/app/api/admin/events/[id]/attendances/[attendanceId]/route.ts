import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { parsePositiveIntegerId } from "@/libs/zod/ids";
import { AttendanceNotFoundError } from "@/services/events/events.errors";
import { eventsService } from "@/services/events/events.service";

async function admin() {
  const user = await getCurrentUser();
  return user && await isAdminByUserId(user.id);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; attendanceId: string }> },
) {
  if (!await admin()) return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });

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
    return NextResponse.json({ message: "更新簽到失敗" }, { status: 400 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; attendanceId: string }> },
) {
  if (!await admin()) return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });

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
    return NextResponse.json({ message: "刪除簽到失敗" }, { status: 400 });
  }
}
