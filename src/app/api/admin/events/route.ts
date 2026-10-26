import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { eventsService } from "@/services/events/events.service";
import { EventCheckInWindowError } from "@/services/events/events.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

export async function GET(request: Request) {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to || new Date(from) >= new Date(to)) {
    return NextResponse.json({ message: "日期區間不正確" }, { status: 400 });
  }
  try {
    const result = await eventsService.getEvents({
      page: 1,
      pageSize: 100,
      startsAfter: from,
      startsBefore: to,
      orderBy: "start_time",
      orderDirection: "asc",
    });
    return NextResponse.json({ data: result.data, total: result.total });
  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/events]", error, "活動資料載入失敗");
  }
}


export async function POST(request: Request) {
  try {
  const authorization = await authorizeAdminRequest("沒有管理權限");
  if (authorization.response) return authorization.response;
  try { return NextResponse.json({ data: await eventsService.createEvent(await request.json()) }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.flattenError(error).fieldErrors }, { status: 400 }); if (error instanceof EventCheckInWindowError) return NextResponse.json({ message: error.message }, { status: 400 }); return unexpectedErrorResponse("[POST /api/admin/events]", error, "建立活動失敗，請稍後再試"); }

  } catch (error) {
    return unexpectedErrorResponse("[POST /api/admin/events]", error, "操作暫時無法完成，請稍後再試。");
  }
}
