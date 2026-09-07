import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { eventsService } from "@/services/events/events.service";
import { EventCheckInWindowError } from "@/services/events/events.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";


export async function POST(request: Request) {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;
  try { return NextResponse.json({ data: await eventsService.createEvent(await request.json()) }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.flattenError(error).fieldErrors }, { status: 400 }); if (error instanceof EventCheckInWindowError) return NextResponse.json({ message: error.message }, { status: 400 }); return unexpectedErrorResponse("[POST /api/admin/events]", error, "建立活動失敗，請稍後再試"); }
}
