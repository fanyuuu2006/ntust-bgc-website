import { NextResponse } from "next/server";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
type Context = { params: Promise<{ id: string }> }; async function admin() { const user = await getCurrentUser(); return Boolean(user && await isAdminByUserId(user.id)); }
export async function PATCH(request: Request, { params }: Context) { if (!await admin()) return NextResponse.json({ message: "您沒有管理幹部職位的權限" }, { status: 403 }); try { return NextResponse.json({ data: await officerPositionsService.updateForAdmin((await params).id, await request.json()) }); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "更新幹部職位失敗" }, { status: 400 }); } }
export async function DELETE(_: Request, { params }: Context) { if (!await admin()) return NextResponse.json({ message: "您沒有管理幹部職位的權限" }, { status: 403 }); try { await officerPositionsService.deleteForAdmin((await params).id); return NextResponse.json({ data: null }); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "移除幹部職位失敗" }, { status: 404 }); } }
