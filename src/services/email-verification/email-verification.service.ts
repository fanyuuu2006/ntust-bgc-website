import "server-only";

import { getTransactionalEmailSender } from "@/libs/email/sender";
import type { TransactionalEmailSender } from "@/libs/email/transactional-email";
import { siteConfigs } from "@/libs/siteConfigs";
import {
  emailVerificationRepository,
  type ConsumeEmailVerificationTokenResult,
  type IssueEmailVerificationTokenResult,
} from "@/repositories/email-verification.repository";
import type { User } from "@/types/database";
import { EmailVerificationCooldownError } from "./email-verification.errors";
import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from "./email-verification-token";

const TOKEN_LIFETIME_MS = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

type EmailVerificationRepository = {
  issue(input: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
    cooldownBefore: string;
  }): Promise<IssueEmailVerificationTokenResult>;
  consume(tokenHash: string): Promise<ConsumeEmailVerificationTokenResult>;
};

type EmailVerificationDependencies = {
  repository: EmailVerificationRepository;
  getSender: () => TransactionalEmailSender;
  now: () => Date;
  generateToken: () => string;
  hashToken: (token: string) => string;
  getSiteOrigin: () => string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createEmailVerificationService(
  dependencies: EmailVerificationDependencies,
) {
  return {
    request: async (
      user: Pick<User, "id" | "email" | "name" | "email_verified_at">,
    ): Promise<"sent" | "already_verified"> => {
      if (user.email_verified_at) return "already_verified";

      const now = dependencies.now();
      const rawToken = dependencies.generateToken();
      const tokenHash = dependencies.hashToken(rawToken);
      const issueResult = await dependencies.repository.issue({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS).toISOString(),
        cooldownBefore: new Date(
          now.getTime() - RESEND_COOLDOWN_MS,
        ).toISOString(),
      });

      if (issueResult === "already_verified") return "already_verified";
      if (issueResult === "cooldown") {
        throw new EmailVerificationCooldownError(
          Math.ceil(RESEND_COOLDOWN_MS / 1000),
        );
      }

      const verificationUrl = new URL("/verify-email", dependencies.getSiteOrigin());
      verificationUrl.searchParams.set("token", rawToken);
      const safeName = escapeHtml(user.name);
      const safeUrl = escapeHtml(verificationUrl.toString());

      await dependencies.getSender().send({
        to: user.email,
        subject: "驗證你的臺科大桌遊社網站 Email",
        text: [
          `${user.name}，你好：`,
          "",
          "你正在建立臺科大桌遊社網站帳號。",
          "請開啟下方連結完成 Email 驗證：",
          verificationUrl.toString(),
          "",
          "此連結將在 60 分鐘後失效。",
          "如果不是你本人操作，可以忽略這封信。",
        ].join("\n"),
        html: [
          `<p>${safeName}，你好：</p>`,
          "<p>你正在建立臺科大桌遊社網站帳號。</p>",
          `<p><a href="${safeUrl}">驗證 Email</a></p>`,
          "<p>此連結將在 60 分鐘後失效。</p>",
          "<p>如果不是你本人操作，可以忽略這封信。</p>",
        ].join(""),
      });

      return "sent";
    },

    verify: async (rawToken: string): Promise<"verified" | "invalid"> => {
      if (!/^[A-Za-z0-9_-]{40,}$/.test(rawToken)) return "invalid";
      return dependencies.repository.consume(dependencies.hashToken(rawToken));
    },
  };
}

export const emailVerificationService = createEmailVerificationService({
  repository: emailVerificationRepository,
  getSender: getTransactionalEmailSender,
  now: () => new Date(),
  generateToken: generateEmailVerificationToken,
  hashToken: hashEmailVerificationToken,
  getSiteOrigin: () => siteConfigs.url,
});
