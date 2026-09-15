import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { ReviewNotFoundError } from "@/services/reviews/reviews.errors";
import { reviewsService } from "@/services/reviews/reviews.service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ message: "請求格式錯誤" }, { status: 400 }); }
    try {
      const { id } = await params;
      const data = await reviewsService.updateOwn(authorization.user.id, id, body);
      return NextResponse.json({ data });
    } catch (error) {
      if (error instanceof ZodError) return NextResponse.json({ message: "評分或評論格式不正確", errors: z.treeifyError(error) }, { status: 400 });
      if (error instanceof ReviewNotFoundError) return NextResponse.json({ message: "找不到你的評分" }, { status: 404 });
      return unexpectedErrorResponse("[PATCH /api/board-games/[id]/reviews/me]", error, "更新評分失敗，請稍後再試");
    }
  } catch (error) {
    return unexpectedErrorResponse("[PATCH /api/board-games/[id]/reviews/me]", error, "操作暫時無法完成，請稍後再試");
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    try {
      const { id } = await params;
      await reviewsService.deleteOwn(authorization.user.id, id);
      return NextResponse.json({ data: { deleted: true } });
    } catch (error) {
      if (error instanceof ZodError) return NextResponse.json({ message: "桌遊 ID 格式不正確" }, { status: 400 });
      if (error instanceof ReviewNotFoundError) return NextResponse.json({ message: "找不到你的評分" }, { status: 404 });
      return unexpectedErrorResponse("[DELETE /api/board-games/[id]/reviews/me]", error, "刪除評分失敗，請稍後再試");
    }
  } catch (error) {
    return unexpectedErrorResponse("[DELETE /api/board-games/[id]/reviews/me]", error, "操作暫時無法完成，請稍後再試");
  }
}
