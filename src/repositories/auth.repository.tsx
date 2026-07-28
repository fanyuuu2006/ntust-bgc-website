import "server-only";
import { AuthCredential, User } from "@/types/database";
import { throwRepositoryError } from "./error";
import { supabase } from "@/libs/supabase/server";

type RegisterUserRepositoryInput = {
  email: string;
  name: string;
  passwordHash: string;
};

export const authRepository = {
  registerUser: async ({
    email,
    name,
    passwordHash,
  }: RegisterUserRepositoryInput): Promise<User> => {
    const { data, error } = await supabase.rpc("register_user", {
      p_email: email,
      p_name: name,
      p_password_hash: passwordHash,
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
