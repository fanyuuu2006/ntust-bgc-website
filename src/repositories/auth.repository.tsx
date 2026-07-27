import "server-only";
import { User } from "@/types/database";
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
};
