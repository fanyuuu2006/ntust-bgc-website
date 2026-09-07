import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { eventsService } from "@/services/events/events.service";
import { EventCheckInWindowError } from "@/services/events/events.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

async function requireAdmin() { const user = await getCurrentUser(); return user && await isAdminByUserId(user.id); }

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });
  try { return NextResponse.json({ data: await eventsService.createEvent(await request.json()) }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.flattenError(error).fieldErrors }, { status: 400 }); if (error instanceof EventCheckInWindowError) return NextResponse.json({ message: error.message }, { status: 400 }); return unexpectedErrorResponse("[POST /api/admin/events]", error, "建立活動失敗，請稍後再試"); }
}
