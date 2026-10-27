import { NextResponse } from "next/server";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { eventsService } from "@/services/events/events.service";
import { ZodError } from "zod";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await eventsService.getPublicEventById(id);
    if (!data) return NextResponse.json({ message: "找不到公開活動" }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "活動 ID 格式不正確" }, { status: 400 });
    return unexpectedErrorResponse("[GET /api/events/[id]]", error, "取得公開活動失敗，請稍後再試");
  }
}
