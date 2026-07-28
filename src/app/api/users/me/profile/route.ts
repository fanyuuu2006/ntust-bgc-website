import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUser } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";

export async function PATCH(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "請求格式錯誤",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          message: "尚未登入或登入已過期",
        },
        {
          status: 401,
        },
      );
    }

    const profile = await usersService.updateProfile(user.id, body);

    return NextResponse.json(
      {
        data: profile,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "輸入資料格式不正確",
          errors: error.issues,
        },
        {
          status: 400,
        },
      );
    }

    console.error("[PATCH /api/users/me/profile]", error);

    return NextResponse.json(
      {
        message: "更新個人資料失敗，請稍後再試",
      },
      {
        status: 500,
      },
    );
  }
}
