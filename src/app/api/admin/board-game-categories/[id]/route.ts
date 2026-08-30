import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { boardGameMasterDataSchema } from "@/services/board-games/board-games.schema";
type Context = { params: Promise<{ id: string }> }; async function authorized() { const user = await getCurrentUser(); return Boolean(user && await isAdminByUserId(user.id)); }
export async function PATCH(request: Request, { params }: Context) { if (!await authorized()) return NextResponse.json({ message: "您沒有管理桌遊種類的權限" }, { status: 403 }); try { return NextResponse.json({ data: await boardGamesService.updateCategory((await params).id, boardGameMasterDataSchema.parse(await request.json())) }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); return NextResponse.json({ message: error instanceof Error ? error.message : "更新桌遊種類失敗" }, { status: 409 }); } }
export async function DELETE(_: Request, { params }: Context) { if (!await authorized()) return NextResponse.json({ message: "您沒有管理桌遊種類的權限" }, { status: 403 }); try { await boardGamesService.deleteCategory((await params).id); return NextResponse.json({ data: null }); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "刪除桌遊種類失敗" }, { status: 409 }); } }
