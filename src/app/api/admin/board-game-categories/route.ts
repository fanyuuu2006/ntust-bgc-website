import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";

const schema = z.object({ name: z.string().trim().min(1, "請輸入種類名稱").max(100), description: z.string().trim().max(500).nullable().optional() });
async function authorized() { const user = await getCurrentUser(); return Boolean(user && await isAdminByUserId(user.id)); }
export async function GET() { if (!await authorized()) return NextResponse.json({ message: "您沒有管理桌遊種類的權限" }, { status: 403 }); return NextResponse.json({ data: await boardGamesService.listCategories() }); }
export async function POST(request: Request) { if (!await authorized()) return NextResponse.json({ message: "您沒有管理桌遊種類的權限" }, { status: 403 }); try { return NextResponse.json({ data: await boardGamesService.createCategory(schema.parse(await request.json())) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); return NextResponse.json({ message: error instanceof Error ? error.message : "新增桌遊種類失敗" }, { status: 409 }); } }
