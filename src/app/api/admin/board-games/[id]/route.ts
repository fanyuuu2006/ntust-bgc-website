import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { boardGamesService } from "@/services/board-games/board-games.service";
import {
  BoardGameCategoryNotFoundError,
  BoardGameHasOpenBorrowingError,
  BoardGameLocationNotFoundError,
  BoardNotFoundError,
  DuplicateInventoryNumberError,
} from "@/services/board-games/board-games.errors";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  const isAdmin = await isAdminByUserId(user.id);
  if (!isAdmin) {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const boardGame = await boardGamesService.getBoardGameById(id);

    return NextResponse.json({ data: boardGame }, { status: 200 });
  } catch (error) {
    if (error instanceof BoardNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    console.error("[GET /api/admin/board-games/[id]]", error);
    return NextResponse.json(
      { message: "取得桌遊資料失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  const isAdmin = await isAdminByUserId(user.id);
  if (!isAdmin) {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const boardGame = await boardGamesService.updateBoardGame(id, body);

    return NextResponse.json({ data: boardGame }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }
    if (error instanceof BoardNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
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

    console.error("[PATCH /api/admin/board-games/[id]]", error);
    return NextResponse.json(
      { message: "更新桌遊失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

  const isAdmin = await isAdminByUserId(user.id);
  if (!isAdmin) {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await boardGamesService.deleteBoardGame(id);

    return NextResponse.json({ data: null }, { status: 200 });
  } catch (error) {
    if (error instanceof BoardNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof BoardGameHasOpenBorrowingError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    console.error("[DELETE /api/admin/board-games/[id]]", error);
    return NextResponse.json(
      { message: "刪除桌遊失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
