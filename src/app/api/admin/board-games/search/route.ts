import { NextResponse } from "next/server";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { boardGamesService } from "@/services/board-games/board-games.service";

export async function GET(request: Request) {
  try {
    const authorization = await authorizeAdminRequest("您沒有管理桌遊的權限");
    if (authorization.response) return authorization.response;
    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
    if (!search || search.length > 100) {
      return NextResponse.json({ message: "請輸入有效的桌遊搜尋文字" }, { status: 400 });
    }
    return NextResponse.json({ data: await boardGamesService.searchForAdminPicker(search) });
  } catch (error) {
    return unexpectedErrorResponse(
      "[GET /api/admin/board-games/search]",
      error,
      "搜尋桌遊失敗，請稍後再試",
    );
  }
}
