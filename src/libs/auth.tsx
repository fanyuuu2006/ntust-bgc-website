import { authService } from "@/services/auth/auth.service";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "bgc_st";
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return authService.getAuthenticatedUser(token);
}
