import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { queryRecordFromSearchParams } from "@/libs/query-params";
import {
  AcademicYearNotFoundError,
  RegisterKeySecretNotConfiguredError,
} from "@/services/memberships/memberships.errors";
import { membershipService } from "@/services/memberships/memberships.service";

export async function GET(request: NextRequest) {
  try {
  const { response } = await authorizeAdminRequest("權限不足");

  if (response) {
    return response;
  }

  try {
    const query = queryRecordFromSearchParams(request.nextUrl.searchParams);
    const result = await membershipService.listRegisterKeys(query);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "查詢參數格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }


    return unexpectedErrorResponse("[GET /api/admin/members/register-keys]", error, "查詢社員註冊序號失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/members/register-keys]", error, "操作暫時無法完成，請稍後再試。");
  }
}

export async function POST(request: Request) {
  try {
  const { user, response } = await authorizeAdminRequest("權限不足");

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
      return unexpectedErrorResponse("[POST /api/admin/members/register-keys]", error, error.message);
    }


    return unexpectedErrorResponse("[POST /api/admin/members/register-keys]", error, "產生社員註冊序號失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[POST /api/admin/members/register-keys]", error, "操作暫時無法完成，請稍後再試。");
  }
}
