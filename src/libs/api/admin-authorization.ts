import { NextResponse } from "next/server";

import { isAdminByUserId } from "@/libs/auth";
import { authorizeVerifiedRequest } from "./verified-authorization";

export async function authorizeAdminRequest(forbiddenMessage: string) {
  const authorization = await authorizeVerifiedRequest();
  if (authorization.response) return authorization;
  const { user } = authorization;

  if (!(await isAdminByUserId(user.id))) {
    return {
      user: null,
      response: NextResponse.json({ message: forbiddenMessage }, { status: 403 }),
    };
  }

  return { user, response: null };
}
