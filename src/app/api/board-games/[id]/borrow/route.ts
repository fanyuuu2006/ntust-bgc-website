import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getCurrentUser } from "@/libs/auth";
import {
  BoardGameBorrowingConflictError,
  BoardGameNotAvailableForBorrowingError,
  BoardNotFoundError,
} from "@/services/board-games/board-games.errors";
import { createBorrowingRequestSchema } from "@/services/board-games/board-games.schema";
import { boardGamesService } from "@/services/board-games/board-games.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payload = createBorrowingRequestSchema.parse({
      ...(typeof body === "object" && body ? body : {}),
      board_game_id: id,
    });
    const borrowing = await boardGamesService.requestBorrowing(user.id, payload.board_game_id);
    return NextResponse.json({ data: borrowing }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 });
    if (error instanceof BoardNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 });
    if (error instanceof BoardGameNotAvailableForBorrowingError || error instanceof BoardGameBorrowingConflictError) return NextResponse.json({ message: error.message }, { status: 409 });
    console.error("[POST /api/board-games/[id]/borrow]", error);
    return NextResponse.json({ message: "提出借用申請失敗，請稍後再試" }, { status: 500 });
  }
}
