import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { DuplicateReviewError } from "@/services/reviews/reviews.errors";
import { reviewsService } from "@/services/reviews/reviews.service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ message: "請求格式錯誤" }, { status: 400 }); }
    try {
      const { id } = await params;
      const data = await reviewsService.create(authorization.user.id, id, body);
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      if (error instanceof ZodError) return NextResponse.json({ message: "評分或評論格式不正確", errors: z.treeifyError(error) }, { status: 400 });
      if (error instanceof BoardNotFoundError) return NextResponse.json({ message: "找不到這款桌遊" }, { status: 404 });
      if (error instanceof DuplicateReviewError) return NextResponse.json({ message: "你已經評分過這款桌遊" }, { status: 409 });
      return unexpectedErrorResponse("[POST /api/board-games/[id]/reviews]", error, "送出評分失敗，請稍後再試");
    }
  } catch (error) {
    return unexpectedErrorResponse("[POST /api/board-games/[id]/reviews]", error, "操作暫時無法完成，請稍後再試");
  }
}
