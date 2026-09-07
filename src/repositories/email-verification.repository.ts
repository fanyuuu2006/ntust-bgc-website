import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "./shared/errors";

export type IssueEmailVerificationTokenResult =
  | "issued"
  | "already_verified"
  | "cooldown";

export type ConsumeEmailVerificationTokenResult = "verified" | "invalid";

export const emailVerificationRepository = {
  issue: async (input: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
    cooldownBefore: string;
  }): Promise<IssueEmailVerificationTokenResult> => {
    const { data, error } = await supabase.rpc(
      "issue_email_verification_token",
      {
        p_user_id: input.userId,
        p_token_hash: input.tokenHash,
        p_expires_at: input.expiresAt,
        p_cooldown_before: input.cooldownBefore,
      },
    );

    if (error) throwRepositoryError("建立 Email 驗證 token 失敗", error);
    if (
      data !== "issued" &&
      data !== "already_verified" &&
      data !== "cooldown"
    ) {
      throwRepositoryError("Email 驗證 token 發行結果不正確", data);
    }
    return data;
  },

  consume: async (
    tokenHash: string,
  ): Promise<ConsumeEmailVerificationTokenResult> => {
    const { data, error } = await supabase.rpc(
      "consume_email_verification_token",
      { p_token_hash: tokenHash },
    );

    if (error) throwRepositoryError("使用 Email 驗證 token 失敗", error);
    if (data !== "verified" && data !== "invalid") {
      throwRepositoryError("Email 驗證 token 使用結果不正確", data);
    }
    return data;
  },
};
