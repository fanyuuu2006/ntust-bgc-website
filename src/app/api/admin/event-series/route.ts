import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { eventSeriesService } from "@/services/events/event-series.service";

export async function POST(request: Request) {
  const authorization = await authorizeAdminRequest("沒有建立活動系列的權限");
  if (authorization.response) return authorization.response;
  try {
    const result = await eventSeriesService.create(authorization.user.id, await request.json());
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "活動系列資料格式不正確", errors: error.flatten().fieldErrors }, { status: 400 });
    return unexpectedErrorResponse("[POST /api/admin/event-series]", error, "建立活動系列失敗");
  }
}
