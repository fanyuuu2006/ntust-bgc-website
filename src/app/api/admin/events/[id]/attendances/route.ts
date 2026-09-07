import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { eventsService } from "@/services/events/events.service";
import { AttendanceAlreadyExistsError, AttendanceUserNotFoundError, EventNotFoundError } from "@/services/events/events.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
async function admin() { const user = await getCurrentUser(); return user && await isAdminByUserId(user.id); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await admin()) return NextResponse.json({ message: "沒有管理權限" }, { status: 403 }); try { const { id } = await params; return NextResponse.json({ data: await eventsService.createAttendanceForAdmin(id, await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof EventNotFoundError || error instanceof AttendanceUserNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); if (error instanceof AttendanceAlreadyExistsError) return NextResponse.json({ message: error.message }, { status: 409 }); return unexpectedErrorResponse("[POST /api/admin/events/[id]/attendances]", error, "建立簽到失敗，請稍後再試"); } }
