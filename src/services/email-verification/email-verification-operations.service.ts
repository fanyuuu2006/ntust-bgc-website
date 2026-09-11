import "server-only";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { emailVerificationRepository } from "@/repositories/email-verification.repository";
import { getVerificationTokenStatus } from "./email-verification-status";

export async function getLatestVerificationForAdmin(userId: string) {
  const viewer = await getCurrentUser();
  if (!viewer?.email_verified_at || !(await isAdminByUserId(viewer.id))) {
    throw new Error("沒有查看 Email 驗證作業資訊的權限");
  }
  const metadata = await emailVerificationRepository.findLatestMetadataByUserId(userId);
  return metadata ? { ...metadata, status: getVerificationTokenStatus(metadata) } : null;
}
