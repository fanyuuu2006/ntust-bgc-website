import "server-only";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";

export const passwordRecoveryRepository = {
  issue: async (userId: string, tokenHash: string, expiresAt: string): Promise<"issued" | "ineligible" | "cooldown"> => {
    const { data, error } = await supabase.rpc("issue_password_recovery_token", {
      p_user_id: userId, p_token_hash: tokenHash, p_expires_at: expiresAt,
    });
    if (error) throwRepositoryError("建立密碼恢復連結失敗", error);
    if (data !== "issued" && data !== "ineligible" && data !== "cooldown")
      throwRepositoryError("密碼恢復發行結果不正確", data);
    return data;
  },
  inspect: async (tokenHash: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("inspect_password_recovery_token", { p_token_hash: tokenHash });
    if (error) throwRepositoryError("檢查密碼恢復連結失敗", error);
    return data === true;
  },
  activate: async (tokenHash: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("activate_password_recovery_token", {
      p_token_hash: tokenHash,
    });
    if (error) throwRepositoryError("啟用密碼恢復連結失敗", error);
    return data === true;
  },
  invalidate: async (tokenHash: string): Promise<void> => {
    const { error } = await supabase.from("password_recovery_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("token_hash", tokenHash).is("consumed_at", null);
    if (error) throwRepositoryError("停用未寄達密碼恢復連結失敗", error);
  },
  consume: async (tokenHash: string, passwordHash: string): Promise<"reset" | "invalid"> => {
    const { data, error } = await supabase.rpc("consume_password_recovery_token", {
      p_token_hash: tokenHash, p_password_hash: passwordHash,
    });
    if (error) throwRepositoryError("重設密碼失敗", error);
    if (data !== "reset" && data !== "invalid")
      throwRepositoryError("密碼恢復消耗結果不正確", data);
    return data;
  },
};
