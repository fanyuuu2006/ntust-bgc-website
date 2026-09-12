import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { parsePositiveIntegerId } from "@/libs/zod/ids";
import {
  BorrowingCancellationConflictError,
  BorrowingNotFoundError,
} from "@/services/board-games/board-games.errors";
import { boardGamesService } from "@/services/board-games/board-games.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
  const authorization = await authorizeVerifiedRequest();
  if (authorization.response) return authorization.response;
  const { user } = authorization;

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


    return unexpectedErrorResponse("[POST /api/users/me/borrowings/[id]/cancel]", error, "取消借用申請失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[POST /api/users/me/borrowings/[id]/cancel]", error, "操作暫時無法完成，請稍後再試。");
  }
}
