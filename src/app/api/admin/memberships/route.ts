import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { membershipService } from "@/services/memberships/memberships.service";
async function admin() { const user = await getCurrentUser(); return Boolean(user && await isAdminByUserId(user.id)); }
export async function POST(request: Request) { if (!await admin()) return NextResponse.json({ message: "您沒有管理社員資格的權限" }, { status: 403 }); try { return NextResponse.json({ data: await membershipService.createForAdmin(await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); return NextResponse.json({ message: error instanceof Error ? error.message : "新增社員資格失敗" }, { status: 409 }); } }
