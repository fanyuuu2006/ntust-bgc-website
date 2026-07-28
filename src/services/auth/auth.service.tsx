import { Session, User } from "@/types/database";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "./auth.schema";
import { usersRepository } from "@/repositories/users.repository";
import { hashPassword, verifyPassword } from "@/utils/auth/password";
import { authRepository } from "@/repositories/auth.repository";
import {
  CannotRevokeCurrentSessionError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  SessionNotFoundError,
} from "./auth.errors";
import { sessionRepository } from "@/repositories/sessions.repository";
import { generateSessionToken } from "@/utils/auth/session";
import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import { SessionSummary } from "./auth.types";

/** Session 有效期：7 天 */
const SESSION_DURATION = 1000 * 60 * 60 * 24 * 7;

/** 每 15 分鐘最多更新一次 last_accessed_at，避免每次驗證都寫入資料庫 */
const SESSION_ACTIVITY_UPDATE_INTERVAL = 1000 * 60 * 15;

/**
 * 用於 timing-safe 密碼比對的假 hash。
 * 當 user 或 credential 不存在時，仍會用這組 hash 執行一次 verifyPassword，
 * 讓「帳號不存在」與「密碼錯誤」兩種情況的回應時間趨於一致，
 * 避免攻擊者透過回應時間差異枚舉出已註冊的 email。
 */
let dummyPasswordHashPromise: Promise<string> | null = null;
function getDummyPasswordHash(): Promise<string> {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = hashPassword(
      "dummy-password-for-timing-safety-only",
    );
  }
  return dummyPasswordHashPromise;
}

/** 計算新 Session 的過期時間（ISO 字串） */
function calculateSessionExpiresAt(): string {
  return new Date(Date.now() + SESSION_DURATION).toISOString();
}

export const authService = {
  /**
   * 註冊新使用者。
   * @throws {EmailAlreadyExistsError} 當 email 已被註冊時
   */
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
      passwordHash,
    });

    await userProfilesRepository.create(user.id, {
      
    });

    return user;
  },

  /**
   * 使用 email/密碼登入並建立新的 Session。
   * @throws {InvalidCredentialsError} 當帳號或密碼錯誤時
   */
  login: async (input: unknown): Promise<{ user: User; session: Session }> => {
    // 驗證輸入資料
    const data = loginSchema.parse(input);

    // 查找使用者
    const user = await usersRepository.findByEmail(data.email);
    const credential = user
      ? await authRepository.findCredentialByUserId(user.id)
      : null;

    // 無論帳號是否存在，都固定執行一次密碼比對（timing-safe）
    const passwordHashToCompare =
      credential?.password_hash ?? (await getDummyPasswordHash());
    const isPasswordValid = await verifyPassword(
      data.password,
      passwordHashToCompare,
    );

    if (!user || !credential || !isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // 建立 Session
    const token = generateSessionToken();
    const session = await sessionRepository.create({
      user_id: user.id,
      token,
      expires_at: calculateSessionExpiresAt(),
    });

    return { user, session };
  },

  /**
   * 依 Session token 取得使用者，並在必要時非同步更新 last_accessed_at。
   * @returns Session 有效時回傳 User，否則回傳 null
   */
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
      void sessionRepository
        .updateById(session.id, {
          last_accessed_at: new Date(now).toISOString(),
        })
        .catch((error) => {
          console.error("[Auth] 更新 Session 最後存取時間失敗", error);
        });
    }

    return usersRepository.findById(session.user_id);
  },

  /** 登出：刪除對應的 Session token */
  logout: async (token: string): Promise<void> => {
    await sessionRepository.deleteByToken(token);
  },

  changePassword: async (userId: string, input: unknown): Promise<void> => {
    const data = changePasswordSchema.parse(input);

    const credential = await authRepository.findCredentialByUserId(userId);

    if (!credential) {
      throw new InvalidCredentialsError();
    }

    const isCurrentPasswordValid = await verifyPassword(
      data.currentPassword,
      credential.password_hash,
    );

    if (!isCurrentPasswordValid) {
      throw new InvalidCurrentPasswordError();
    }

    const newPasswordHash = await hashPassword(data.newPassword);

    await authRepository.updateCredentialByUserId(userId, {
      password_hash: newPasswordHash,
    });
  },

  listSessions: async (
    userId: string,
    currentToken: string,
  ): Promise<SessionSummary[]> => {
    const sessions = await sessionRepository.findManyByUserId(userId);
    return sessions.map((session) => ({
      id: session.id,
      created_at: session.created_at,
      last_accessed_at: session.last_accessed_at,
      expires_at: session.expires_at,
      is_current: session.token === currentToken,
    }));
  },

  revokeSession: async (
    userId: string,
    sessionId: string,
    currentSessionToken: string,
  ): Promise<void> => {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }
    if (session.user_id !== userId) {
      throw new SessionNotFoundError();
    }
    if (session.token === currentSessionToken) {
      throw new CannotRevokeCurrentSessionError();
    }
    await sessionRepository.deleteById(sessionId);
  },

  revokeOtherSessions: async (
    userId: string,
    currentSessionToken: string,
  ): Promise<void> => {
    await sessionRepository.deleteAllByUserIdExceptToken(
      userId,
      currentSessionToken,
    );
  },
};
