import { authService } from "@/services/auth/auth.service";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "bgc_st";

export const getSessionTokenFromCookie = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
};

export async function getCurrentUser() {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return null;
  }

  return authService.getUserBySessionToken(token);
}

export function isAdminByUserId(userId: string) {
  return officerPositionsService.isCurrentOfficer(userId);
}
