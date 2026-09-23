import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getTransactionalEmailSender } from "@/libs/email/sender";
import { siteConfigs } from "@/libs/siteConfigs";
import { reportUnexpectedError } from "@/libs/observability/report";
import { usersRepository } from "@/repositories/users.repository";
import { passwordRecoveryRepository } from "@/repositories/password-recovery.repository";
import { hashPassword } from "@/utils/auth/password";
import { passwordSchema } from "./auth.schema";

export const RECOVERY_TOKEN_LIFETIME_MINUTES = 60;
export const RECOVERY_COOKIE_NAME = "bgc_pr";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;
export const passwordRecoveryRequestSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
}).strict();
export const passwordRecoveryResetSchema = z.object({
  token: z.string().regex(TOKEN_PATTERN),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).strict().refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"], message: "兩次輸入的新密碼不一致",
});

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const passwordRecoveryService = {
  request: async (input: unknown): Promise<void> => {
    const { email } = passwordRecoveryRequestSchema.parse(input);
    const user = await usersRepository.findByEmail(email);
    if (!user || user.closed_at) return;

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + RECOVERY_TOKEN_LIFETIME_MINUTES * 60_000).toISOString();
    const issued = await passwordRecoveryRepository.issue(user.id, tokenHash, expiresAt);
    if (issued !== "issued") return;

    const url = new URL("/api/auth/password-recovery/open", siteConfigs.url);
    url.searchParams.set("token", token);
    try {
      await getTransactionalEmailSender().send({
        to: user.email,
        subject: "重設臺科大桌遊社網站密碼",
        text: `請開啟下方連結重設密碼。連結於 ${RECOVERY_TOKEN_LIFETIME_MINUTES} 分鐘後失效。\n${url}\n\n如果不是你本人提出要求，可以忽略這封信。`,
        html: `<p>請開啟下方連結重設密碼。連結於 ${RECOVERY_TOKEN_LIFETIME_MINUTES} 分鐘後失效。</p><p><a href="${url.toString().replaceAll("&", "&amp;")}">重設密碼</a></p><p>如果不是你本人提出要求，可以忽略這封信。</p>`,
      });
      const activated = await passwordRecoveryRepository.activate(tokenHash);
      if (!activated) throw new Error("Password recovery token activation failed");
    } catch (error) {
      reportUnexpectedError(error, { context: "password-recovery.delivery" });
      try {
        await passwordRecoveryRepository.invalidate(tokenHash);
      } catch (cleanupError) {
        reportUnexpectedError(cleanupError, { context: "password-recovery.delivery-cleanup" });
      }
    }
  },
  inspect: async (rawToken: string): Promise<boolean> =>
    TOKEN_PATTERN.test(rawToken) && passwordRecoveryRepository.inspect(hashToken(rawToken)),
  reset: async (input: unknown): Promise<"reset" | "invalid"> => {
    const data = passwordRecoveryResetSchema.parse(input);
    const passwordHash = await hashPassword(data.newPassword);
    return passwordRecoveryRepository.consume(hashToken(data.token), passwordHash);
  },
};
