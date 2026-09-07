import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { eventsService } from "@/services/events/events.service";
import { AttendanceAlreadyExistsError, AttendanceUserNotFoundError, EventNotFoundError } from "@/services/events/events.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { const authorization = await authorizeAdminRequest("沒有管理權限"); if (authorization.response) return authorization.response; try { const { id } = await params; return NextResponse.json({ data: await eventsService.createAttendanceForAdmin(id, await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof EventNotFoundError || error instanceof AttendanceUserNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); if (error instanceof AttendanceAlreadyExistsError) return NextResponse.json({ message: error.message }, { status: 409 }); return unexpectedErrorResponse("[POST /api/admin/events/[id]/attendances]", error, "建立簽到失敗，請稍後再試"); } }
