import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { ReviewNotFoundError } from "@/services/reviews/reviews.errors";
import { reviewsService } from "@/services/reviews/reviews.service";

type Context = { params: Promise<{ id: string; reviewId: string }> };

export async function PUT(request: Request, { params }: Context) {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "請提供有效的 JSON 資料" }, { status: 400 });
    }

    try {
      const { id, reviewId } = await params;
      const data = await reviewsService.setLike(authorization.user.id, id, reviewId, body);
      return NextResponse.json({ data });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: "按讚資料格式不正確", errors: z.treeifyError(error) },
          { status: 400 },
        );
      }
      if (error instanceof ReviewNotFoundError) {
        return NextResponse.json({ message: "找不到可互動的評論" }, { status: 404 });
      }
      return unexpectedErrorResponse(
        "[PUT /api/board-games/[id]/reviews/[reviewId]/like]",
        error,
        "更新評論按讚狀態失敗，請稍後再試",
      );
    }
  } catch (error) {
    return unexpectedErrorResponse(
      "[PUT /api/board-games/[id]/reviews/[reviewId]/like]",
      error,
      "驗證登入狀態失敗，請稍後再試",
    );
  }
}
