import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getCurrentUser } from "@/libs/auth";
import { usersService } from "@/services/users/users.service";
import {
  UserProfileAlreadyExistsError,
  UserProfileNotFoundError,
} from "@/services/users/users.errors";
import type { User } from "@/types/database";

/**
 * 驗證是否已登入。
 * 已登入回傳 User，未登入直接回傳可用的 401 NextResponse，
 * 由呼叫端用 `instanceof NextResponse` 判斷是否要提早 return。
 */
async function requireUser(): Promise<User | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { message: "尚未登入或登入已過期" },
      { status: 401 },
    );
  }
  return user;
}

export async function GET() {
  const authResult = await requireUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult;

  try {
    const profile = await usersService.getProfile(user.id);

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/users/me/profile]", error);

    return NextResponse.json(
      { message: "取得個人資料失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  // 先驗證登入，避免對未授權請求做無謂的 body parsing
  const authResult = await requireUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "請求格式錯誤" }, { status: 400 });
  }

  try {
    const profile = await usersService.createProfile(user.id, body);

    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof UserProfileAlreadyExistsError) {
      return NextResponse.json({ message: "個人資料已存在" }, { status: 409 });
    }

    console.error("[POST /api/users/me/profile]", error);

    return NextResponse.json(
      { message: "建立個人資料失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const authResult = await requireUser();
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "請求格式錯誤" }, { status: 400 });
  }

  try {
    const profile = await usersService.updateProfile(user.id, body);

    return NextResponse.json({ data: profile }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/users/me/profile]", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    if (error instanceof UserProfileNotFoundError) {
      return NextResponse.json({ message: "找不到個人資料" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "更新個人資料失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
