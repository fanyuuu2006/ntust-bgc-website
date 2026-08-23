import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import {
  AcademicYearNotFoundError,
  RegisterKeySecretNotConfiguredError,
} from "@/services/memberships/memberships.errors";
import { membershipService } from "@/services/memberships/memberships.service";

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ message: "請先登入" }, { status: 401 }),
    };
  }

  const isAdmin = await isAdminByUserId(user.id);

  if (!isAdmin) {
    return {
      user: null,
      response: NextResponse.json({ message: "權限不足" }, { status: 403 }),
    };
  }

  return { user, response: null };
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin();

  if (response) {
    return response;
  }

  try {
    const query = Object.fromEntries(
      [...request.nextUrl.searchParams.keys()].map((key) => {
        const values = request.nextUrl.searchParams.getAll(key);
        return [key, values.length > 1 ? values : values[0]];
      }),
    );
    const result = await membershipService.listRegisterKeys(query);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "查詢參數格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    console.error("[GET /api/admin/members/register-keys]", error);
    return NextResponse.json(
      { message: "查詢社員註冊序號失敗，請稍後再試" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireAdmin();

  if (response || !user) {
    return response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "請提供有效的 JSON 資料" },
      { status: 400 },
    );
  }

  try {
    const registerKeys = await membershipService.generateRegisterKeys(
      user.id,
      body,
    );

    return NextResponse.json({ data: registerKeys }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    if (error instanceof AcademicYearNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    if (error instanceof RegisterKeySecretNotConfiguredError) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    console.error("[POST /api/admin/members/register-keys]", error);
    return NextResponse.json(
      { message: "產生社員註冊序號失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
