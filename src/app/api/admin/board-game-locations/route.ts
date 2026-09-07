import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { boardGameMasterDataSchema } from "@/services/board-games/board-games.schema";
import { DuplicateBoardGameLocationNameError } from "@/services/board-games/board-games.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
export async function GET() { const authorization = await authorizeAdminRequest("您沒有管理桌遊位置的權限"); if (authorization.response) return authorization.response; return NextResponse.json({ data: await boardGamesService.listLocations() }); }
export async function POST(request: Request) { const authorization = await authorizeAdminRequest("您沒有管理桌遊位置的權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await boardGamesService.createLocation(boardGameMasterDataSchema.parse(await request.json())) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof DuplicateBoardGameLocationNameError) return NextResponse.json({ message: error.message }, { status: 409 }); return unexpectedErrorResponse("[POST /api/admin/board-game-locations]", error, "新增桌遊位置失敗，請稍後再試"); } }
