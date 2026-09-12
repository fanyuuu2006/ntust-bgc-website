import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { boardGameMasterDataSchema } from "@/services/board-games/board-games.schema";
import { DuplicateBoardGameCategoryNameError } from "@/services/board-games/board-games.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";

export async function GET() {
  try { const authorization = await authorizeAdminRequest("您沒有管理桌遊種類的權限"); if (authorization.response) return authorization.response; return NextResponse.json({ data: await boardGamesService.listCategories() });
  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/board-game-categories]", error, "操作暫時無法完成，請稍後再試。");
  }
}
export async function POST(request: Request) {
  try { const authorization = await authorizeAdminRequest("您沒有管理桌遊種類的權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await boardGamesService.createCategory(boardGameMasterDataSchema.parse(await request.json())) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof DuplicateBoardGameCategoryNameError) return NextResponse.json({ message: error.message }, { status: 409 }); return unexpectedErrorResponse("[POST /api/admin/board-game-categories]", error, "新增桌遊種類失敗，請稍後再試"); }
  } catch (error) {
    return unexpectedErrorResponse("[POST /api/admin/board-game-categories]", error, "操作暫時無法完成，請稍後再試。");
  }
}
