import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUser } from "@/libs/auth";
import { parsePositiveIntegerId } from "@/libs/zod/ids";
import {
  BorrowingCancellationConflictError,
  BorrowingNotFoundError,
} from "@/services/board-games/board-games.errors";
import { boardGamesService } from "@/services/board-games/board-games.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });

  try {
    const { id: rawId } = await params;
    const borrowing = await boardGamesService.cancelPendingBorrowingByUserId(
      user.id,
      parsePositiveIntegerId(rawId),
    );
    return NextResponse.json({ data: borrowing }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "借用紀錄 ID 格式不正確" }, { status: 400 });
    }
    if (error instanceof BorrowingNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    if (error instanceof BorrowingCancellationConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    console.error("[POST /api/users/me/borrowings/[id]/cancel]", error);
    return NextResponse.json({ message: "取消借用申請失敗，請稍後再試" }, { status: 500 });
  }
}
