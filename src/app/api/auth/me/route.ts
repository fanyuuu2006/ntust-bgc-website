import { NextResponse } from "next/server";

import { getCurrentUser } from "@/libs/auth";

export async function GET() {
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

  return NextResponse.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
  });
}
