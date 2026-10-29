import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { eventSeriesService } from "@/services/events/event-series.service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest("沒有讀取活動系列的權限");
  if (authorization.response) return authorization.response;
  try {
    const { id } = await context.params;
    const parsed = z.uuid().safeParse(id);
    if (!parsed.success) return NextResponse.json({ message: "活動系列識別碼無效" }, { status: 400 });
    const result = await eventSeriesService.getById(parsed.data);
    if (!result) return NextResponse.json({ message: "找不到活動系列" }, { status: 404 });
    return NextResponse.json({ data: result });
  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/event-series/:id]", error, "讀取活動系列失敗");
  }
}
