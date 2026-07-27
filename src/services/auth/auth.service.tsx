import { Session, User } from "@/types/database";
import { loginSchema, registerSchema } from "./auth.schema";
import { usersRepository } from "@/repositories/users.repository";
import { hashPassword, verifyPassword } from "@/utils/auth/password";
import { authRepository } from "@/repositories/auth.repository";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
} from "./auth.errors";
import { sessionRepository } from "@/repositories/session.repository";
import { generateSessionToken } from "@/utils/auth/session";

const SESSION_DURATION = 1000 * 60 * 60 * 24 * 7;
// Session 有效期：7 天

const SESSION_ACTIVITY_UPDATE_INTERVAL = 1000 * 60 * 15;
// 每 15 分鐘最多更新一次 last_accessed_at

export const authService = {
  register: async (input: unknown): Promise<User> => {
    // 驗證輸入資料
    const data = registerSchema.parse(input);

    // 檢查 email 是否已存在
    const isEmailExist = await usersRepository.existsByEmail(data.email);
    if (isEmailExist) {
      throw new EmailAlreadyExistsError();
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
  login: async (input: unknown): Promise<{ user: User; session: Session }> => {
    // 驗證輸入資料
    const data = loginSchema.parse(input);

    // 查找使用者
    const user = await usersRepository.findByEmail(data.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    // 驗證密碼
    const credential = await authRepository.findCredentialByUserId(user.id);
    if (!credential) {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await verifyPassword(
      data.password,
      credential.password_hash,
    );
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // 5. 建立 Session Token
    const token = generateSessionToken();

    // 6. 設定過期時間
    const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

    // 7. 寫入資料庫
    const session = await sessionRepository.create({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    return {
      user,
      session,
    };
  },
  getUserBySessionToken: async (token: string): Promise<User | null> => {
    const session = await sessionRepository.findValidByToken(token);

    if (!session) {
      return null;
    }

    const now = Date.now();
    const lastAccessedAt = new Date(session.last_accessed_at).getTime();

    const shouldUpdateLastAccessedAt =
      now - lastAccessedAt >= SESSION_ACTIVITY_UPDATE_INTERVAL;

    if (shouldUpdateLastAccessedAt) {
      await sessionRepository.updateById(session.id, {
        last_accessed_at: new Date(now).toISOString(),
      });
    }

    return usersRepository.findById(session.user_id);
  },
  logout: async (token: string): Promise<void> => {
    await sessionRepository.deleteByToken(token);
  },
};
