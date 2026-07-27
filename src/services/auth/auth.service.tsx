import { User } from "@/types/database";
import { registerSchema } from "./auth.schema";
import { usersRepository } from "@/repositories/users.repository";
import { hashPassword } from "@/utils/auth/password";
import { authRepository } from "@/repositories/auth.repository";

export const authService = {
  register: async (input: unknown): Promise<User> => {
    // 驗證輸入資料
    const data = registerSchema.parse(input);

    // 檢查 email 是否已存在
    const isEmailExist = await usersRepository.existsByEmail(data.email);
    if (isEmailExist) {
      throw new Error("此 Email 已經註冊");
    }

    // hash 密碼
    const passwordHash = await hashPassword(data.password);

    const user = await authRepository.registerUser({
      email: data.email,
      name: data.name,
      passwordHash: passwordHash,
    });

    return user;
  },
};
