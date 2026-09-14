import { reportUnexpectedError } from "@/libs/observability/report";
import { z } from "zod";
import { AccountClosureBlockedError } from "./account-closure.errors";
import { Session, User } from "@/types/database";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "./auth.schema";
import { usersRepository } from "@/repositories/users.repository";
import { hashPassword, verifyPassword } from "@/utils/auth/password";
import { authRepository } from "@/repositories/auth.repository";
import { RepositoryError } from "@/repositories/shared/errors";
import {
  CannotRevokeCurrentSessionError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  SessionNotFoundError,
} from "./auth.errors";
import { sessionRepository } from "@/repositories/sessions.repository";
import { generateSessionToken, hashSessionToken } from "@/utils/auth/session";
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
  /** 重驗成功後才進入交易；嚴格輸入避免接受 client 指定另一個帳號。 */
  closeAccount: async (userId: string, sessionToken: string, input: unknown): Promise<void> => {
    const data = z.object({
      currentPassword: z.string().min(1, "請輸入目前密碼").max(128),
      confirmation: z.literal("註銷帳號", { error: "請完整輸入「註銷帳號」" }),
    }).strict().parse(input);
    const credential = await authRepository.findCredentialByUserId(userId);
    if (!credential) throw new InvalidCredentialsError();
    if (!(await verifyPassword(data.currentPassword, credential.password_hash))) {
      throw new InvalidCurrentPasswordError();
    }
    try {
      await authRepository.closeAccount(hashSessionToken(sessionToken), credential.password_hash);
    } catch (error) {
      const code = repositoryCode(error);
      if (code === "PCL02") throw new AccountClosureBlockedError();
      if (code === "PCL01") throw new InvalidCredentialsError();
      if (code === "PCL03") throw new InvalidCurrentPasswordError();
      throw error;
    }
  },
  /**
   * 註冊新使用者。
   * @throws {EmailAlreadyExistsError} 當 email 已被註冊時
   */
  register: async (input: unknown): Promise<User> => {
    // 驗證輸入資料
    const data = registerSchema.parse(input);

    // Email 唯一性由交易內的 DB constraint 決定；預查無法避免同時註冊的競爭。

    // hash 密碼
    const passwordHash = await hashPassword(data.password);

    try {
      return await authRepository.registerUser({
        email: data.email,
        name: data.name,
        passwordHash,
        realName: data.real_name,
        phone: data.phone,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailAlreadyExistsError();
      throw error;
    }
  },

  /**
   * 使用 email/密碼登入並建立新的 Session。
   * @throws {InvalidCredentialsError} 當帳號或密碼錯誤時
   */
  login: async (input: unknown): Promise<{ user: User; session: Session; rawToken: string }> => {
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

    if (!user || user.closed_at || !credential || !isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    // 建立 Session
    const token = generateSessionToken();
    let session: Session;
    try {
      session = await sessionRepository.create({
      user_id: user.id,
      token_hash: hashSessionToken(token),
      expires_at: calculateSessionExpiresAt(),
      });
    } catch (error) {
      // 註銷可能在密碼核對後完成；DB 的 Session guard 是最後一道防線。
      if (repositoryCode(error) === "PCL01") throw new InvalidCredentialsError();
      throw error;
    }

    return { user, session, rawToken: token };
  },

  /**
   * 依 Session token 取得使用者，並在必要時非同步更新 last_accessed_at。
   * @returns Session 有效時回傳 User，否則回傳 null
   */
  getUserBySessionToken: async (token: string): Promise<User | null> => {
    const session = await sessionRepository.findValidByTokenHash(hashSessionToken(token));

    if (!session) {
      return null;
    }

    const user = await usersRepository.findById(session.user_id, "user-session");
    if (!user || user.closed_at) return null;

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
          reportUnexpectedError(error, { context: "auth.session-touch" });
        });
    }

    return user;
  },

  /** 登出：刪除對應的 Session token */
  logout: async (token: string): Promise<void> => {
    await sessionRepository.deleteByTokenHash(hashSessionToken(token));
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
    const currentHash = hashSessionToken(currentToken);
    return sessions.map((session) => ({
      id: session.id,
      created_at: session.created_at,
      last_accessed_at: session.last_accessed_at,
      expires_at: session.expires_at,
      is_current: session.token_hash === currentHash,
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
    if (session.token_hash === hashSessionToken(currentSessionToken)) {
      throw new CannotRevokeCurrentSessionError();
    }
    await sessionRepository.deleteById(sessionId);
  },

  revokeOtherSessions: async (
    userId: string,
    currentSessionToken: string,
  ): Promise<void> => {
    await sessionRepository.deleteAllByUserIdExceptTokenHash(
      userId,
      hashSessionToken(currentSessionToken),
    );
  },
};

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof RepositoryError) || typeof error.cause !== "object" || error.cause === null) return false;
  return (error.cause as { code?: unknown }).code === "23505";
}

function repositoryCode(error: unknown): unknown {
  if (!(error instanceof RepositoryError) || typeof error.cause !== "object" || error.cause === null) return undefined;
  return (error.cause as { code?: unknown }).code;
}
