import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { listBoardGamesQuerySchema } from "@/services/board-games/board-games.schema";
import {
  BoardGameCategoryNotFoundError,
  BoardGameLocationNotFoundError,
  DuplicateInventoryNumberError,
} from "@/services/board-games/board-games.errors";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  const isAdmin = await isAdminByUserId(user.id);
  if (!isAdmin) {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  try {
    const query = listBoardGamesQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const result =
      await boardGamesService.listBoardGamesWithCategoryAndLocation(query);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "查詢參數格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    console.error("[GET /api/admin/board-games]", error);
    return NextResponse.json(
      { message: "取得桌遊列表失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  const isAdmin = await isAdminByUserId(user.id);
  if (!isAdmin) {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const boardGame = await boardGamesService.createBoardGame(body);

    return NextResponse.json({ data: boardGame }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }
    if (error instanceof DuplicateInventoryNumberError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (
      error instanceof BoardGameCategoryNotFoundError ||
      error instanceof BoardGameLocationNotFoundError
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    console.error("[POST /api/admin/board-games]", error);
    return NextResponse.json(
      { message: "新增桌遊失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
