import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { checkRateLimit, getRequestIp } from "@/libs/security/rate-limit";
import {
  CurrentAcademicYearNotFoundError,
  MembershipRegisterKeyAlreadyUsedError,
  MembershipRegisterKeyInactiveError,
  MembershipRegisterKeyNotCurrentYearError,
  MembershipRegisterKeyNotFoundError,
  UserAlreadyCurrentMemberError,
} from "@/services/memberships/memberships.errors";
import { membershipService } from "@/services/memberships/memberships.service";

export async function POST(request: Request) {
  try {
  const authorization = await authorizeVerifiedRequest();
  if (authorization.response) return authorization.response;
  const { user } = authorization;

  const rateLimit = checkRateLimit(
    `membership-activate:${user.id}:${getRequestIp(request)}`,
    {
      limit: 10,
      windowMs: 60 * 1000,
    },
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { message: "嘗試次數過多，請稍後再試" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      },
    );
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
    const membership = await membershipService.activateByRegisterKey(
      user.id,
      body,
    );

    return NextResponse.json({ data: membership }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
        { status: 400 },
      );
    }

    if (error instanceof CurrentAcademicYearNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    if (
      error instanceof UserAlreadyCurrentMemberError
    ) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    if (
      error instanceof MembershipRegisterKeyNotFoundError ||
      error instanceof MembershipRegisterKeyAlreadyUsedError ||
      error instanceof MembershipRegisterKeyInactiveError
    ) {
      return NextResponse.json(
        { message: "社員註冊序號不存在或無法使用" },
        { status: 404 },
      );
    }

    if (error instanceof MembershipRegisterKeyNotCurrentYearError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }


    return unexpectedErrorResponse("[POST /api/memberships/activate]", error, "啟用社員資格失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[POST /api/memberships/activate]", error, "操作暫時無法完成，請稍後再試。");
  }
}
