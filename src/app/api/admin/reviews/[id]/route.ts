import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { ReviewNotFoundError } from "@/services/reviews/reviews.errors";
import { reviewsService } from "@/services/reviews/reviews.service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authorization = await authorizeAdminRequest("您沒有管理評價的權限");
    if (authorization.response) return authorization.response;

    try {
      await reviewsService.deleteForAdmin((await params).id);
      return NextResponse.json({ data: { deleted: true } });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({ message: "評價 ID 格式不正確" }, { status: 400 });
      }
      if (error instanceof ReviewNotFoundError) {
        return NextResponse.json({ message: error.message }, { status: 404 });
      }
      return unexpectedErrorResponse(
        "[DELETE /api/admin/reviews/[id]]",
        error,
        "刪除評價失敗，請稍後再試",
      );
    }
  } catch (error) {
    return unexpectedErrorResponse(
      "[DELETE /api/admin/reviews/[id]]",
      error,
      "系統暫時無法處理請求，請稍後再試",
    );
  }
}
