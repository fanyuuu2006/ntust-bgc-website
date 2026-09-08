import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { queryRecordFromSearchParams } from "@/libs/query-params";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { listBorrowingsQuerySchema } from "@/services/board-games/board-games.schema";

export async function GET(request: NextRequest) {
  const authorization = await authorizeVerifiedRequest();
  if (authorization.response) return authorization.response;
  const { user } = authorization;

  try {
    const result = listBorrowingsQuerySchema.parse(
      queryRecordFromSearchParams(request.nextUrl.searchParams),
    );

    const borrowings = await boardGamesService.getBorrowingsByUserId(
      user.id,
      result,
    );

    return NextResponse.json({ data: borrowings }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "查詢參數格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    console.error("[GET /api/users/me/borrowings]", error);
    return NextResponse.json(
      { message: "取得借用紀錄失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
