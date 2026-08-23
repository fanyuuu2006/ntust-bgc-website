import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { eventsService } from "@/services/events/events.service";

async function requireAdmin() { const user = await getCurrentUser(); return user && await isAdminByUserId(user.id); }

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });
  try { return NextResponse.json({ data: await eventsService.createEvent(await request.json()) }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.flattenError(error).fieldErrors }, { status: 400 }); return NextResponse.json({ message: error instanceof Error ? error.message : "建立活動失敗" }, { status: 400 }); }
}
