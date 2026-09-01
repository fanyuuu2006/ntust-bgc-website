import { authService } from "@/services/auth/auth.service";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { cookies } from "next/headers";
import { cache } from "react";

export const SESSION_COOKIE_NAME = "bgc_st";

export const getSessionTokenFromCookie = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
};

export const getCurrentUser = cache(async () => {
  const token = await getSessionTokenFromCookie();
  if (!token) {
    return null;
  }

  return authService.getUserBySessionToken(token);
});

// 固定為曾經擔任幹部職位的使用者，才算是管理員
export function isAdminByUserId(userId: string) {
  return officerPositionsService.hasEverBeenOfficer(userId);
}
