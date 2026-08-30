import { NextResponse } from "next/server";

import { getCurrentUser } from "@/libs/auth";
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
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "請先登入" }, { status: 401 });
  }

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

    console.error("[POST /api/events/[id]/check-in]", error);
    return NextResponse.json(
      { message: "簽到失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
