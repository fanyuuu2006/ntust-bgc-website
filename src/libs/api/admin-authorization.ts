import { NextResponse } from "next/server";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";

export async function authorizeAdminRequest(forbiddenMessage: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ message: "請先登入" }, { status: 401 }),
    };
  }

  if (!(await isAdminByUserId(user.id))) {
    return {
      user: null,
      response: NextResponse.json({ message: forbiddenMessage }, { status: 403 }),
    };
  }

  return { user, response: null };
}
