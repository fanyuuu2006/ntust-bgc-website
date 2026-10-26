import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { eventsService } from "@/services/events/events.service";

export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    return NextResponse.json({ data: await eventsService.getPublicEvents(query) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "查詢參數格式不正確", errors: z.flattenError(error).fieldErrors }, { status: 400 });
    }
    return unexpectedErrorResponse("[GET /api/events]", error, "取得公開活動失敗，請稍後再試");
  }
}
