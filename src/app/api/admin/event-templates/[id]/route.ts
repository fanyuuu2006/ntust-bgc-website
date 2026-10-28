import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { eventTemplatesService } from "@/services/events/event-templates.service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const auth = await authorizeAdminRequest("管理活動範本"); if (auth.response) return auth.response; return NextResponse.json({ data: await eventTemplatesService.get((await params).id) }); }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { const auth = await authorizeAdminRequest("管理活動範本"); if (auth.response) return auth.response; try { return NextResponse.json({ data: await eventTemplatesService.update((await params).id, await request.json()) }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "範本資料格式不正確", errors: error.flatten().fieldErrors }, { status: 400 }); throw error; } }
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) { const auth = await authorizeAdminRequest("管理活動範本"); if (auth.response) return auth.response; await eventTemplatesService.delete((await params).id); return NextResponse.json({ data: null }); }
