import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextResponse } from "next/server";

import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import {
  EventNotFoundError,
  SelfCheckInAlreadyCompletedError,
  SelfCheckInClosedError,
  SelfCheckInMembershipRequiredError,
} from "@/services/events/events.errors";
import { eventsService } from "@/services/events/events.service";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const authorization = await authorizeVerifiedRequest();
  if (authorization.response) return authorization.response;
  const { user } = authorization;

  try {
    const { id } = await params;
    const attendance = await eventsService.selfCheckIn(user.id, id);
    return NextResponse.json({ data: attendance }, { status: 201 });
  } catch (error) {
    if (error instanceof EventNotFoundError) {
      return NextResponse.json({ message: "找不到活動" }, { status: 404 });
    }

    if (error instanceof SelfCheckInMembershipRequiredError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    if (
      error instanceof SelfCheckInClosedError ||
      error instanceof SelfCheckInAlreadyCompletedError
    ) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }


    return unexpectedErrorResponse("[POST /api/events/[id]/check-in]", error, "簽到失敗，請稍後再試");
  }

  } catch (error) {
    return unexpectedErrorResponse("[POST /api/events/[id]/check-in]", error, "操作暫時無法完成，請稍後再試。");
  }
}
