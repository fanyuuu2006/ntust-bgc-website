import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { eventsService } from "@/services/events/events.service";
async function admin() { const user = await getCurrentUser(); return user && await isAdminByUserId(user.id); }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { if (!await admin()) return NextResponse.json({ message: "沒有管理權限" }, { status: 403 }); try { const { id } = await params; return NextResponse.json({ data: await eventsService.createAttendanceForAdmin(id, await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); return NextResponse.json({ message: error instanceof Error ? error.message : "建立簽到失敗" }, { status: 409 }); } }
