import "server-only";
import { AuthCredential, User } from "@/types/database";
import { throwRepositoryError } from "./shared/errors";
import { supabase } from "@/libs/supabase/server";

type RegisterUserRepositoryInput = {
  email: string;
  name: string;
  passwordHash: string;
  realName: string;
  phone: string;
};

export const authRepository = {
  /** 由交易重新核對 Session 與已驗證的憑證版本，不將 hash 或 token 寫入日誌。 */
  closeAccount: async (sessionToken: string, expectedPasswordHash: string): Promise<void> => {
    const { error } = await supabase.rpc("close_account", {
      p_session_token: sessionToken,
      p_expected_password_hash: expectedPasswordHash,
    });
    if (error) throwRepositoryError("註銷帳號失敗", error);
  },
  registerUser: async ({
    email,
    name,
    passwordHash,
    realName,
    phone,
  }: RegisterUserRepositoryInput): Promise<User> => {
    const { data, error } = await supabase.rpc("register_user", {
      p_email: email,
      p_name: name,
      p_password_hash: passwordHash,
      p_real_name: realName,
      p_phone: phone,
    });

    if (error) {
      throwRepositoryError("註冊使用者失敗", error);
    }

    return data;
  },
  findCredentialByUserId: async (
    userId: string,
  ): Promise<AuthCredential | null> => {
    const { data, error } = await supabase
      .from("auth_credentials")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throwRepositoryError("取得使用者驗證憑證失敗", error);
    }

    return data;
  },
  updateCredentialByUserId: async (
    userId: string,
    payload: Partial<Pick<AuthCredential, "password_hash">>,
  ): Promise<void> => {
    const { error } = await supabase
      .from("auth_credentials")
      .update(payload)
      .eq("user_id", userId);

    if (error) {
      throwRepositoryError("更新使用者驗證憑證失敗", error);
    }
  },
};
