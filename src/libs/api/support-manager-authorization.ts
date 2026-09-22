import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/libs/auth";
import { isSupportManager } from "@/libs/support-manager";

export async function authorizeSupportManagerRequest() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ message: "請先登入" }, { status: 401 }) };
  }
  if (!isSupportManager(user)) {
    return { user: null, response: NextResponse.json({ message: "無權存取" }, { status: 403 }) };
  }
  return { user, response: null };
}
