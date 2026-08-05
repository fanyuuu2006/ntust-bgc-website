import "server-only";
import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import {
  createUserProfileSchema,
  updateAcademicProfileSchema,
  updateUserAccountSchema,
  updateUserProfileSchema,
} from "./users.schema";
import type { User, UserProfile } from "@/types/database";
import {
  UserProfileAlreadyExistsError,
  UserProfileNotFoundError,
} from "./users.errors";
import { usersRepository } from "@/repositories/users.repository";

export const usersService = {
  getProfile: async (userId: string): Promise<UserProfile | null> => {
    return userProfilesRepository.findByUserId(userId);
  },

  /**
   * 建立使用者個人資料。
   *
   * 不先查詢是否已存在再新增，避免 TOCTOU race condition，
   * 直接交由資料庫 unique constraint（user_id）把關，
   * 再由這裡把 unique violation 翻譯成可讀的 domain error。
   *
   * @throws {UserProfileAlreadyExistsError} 當該 userId 已存在個人資料時
   */
  createProfile: async (userId: string, payload: unknown) => {
    const data = createUserProfileSchema.parse(payload);

    try {
      return await userProfilesRepository.create(userId, data);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserProfileAlreadyExistsError();
      }
      throw error;
    }
  },

  /**
   * 更新使用者個人資料（部分欄位）。
   * @throws {UserProfileNotFoundError} 當該 userId 沒有對應的個人資料時
   */
  updateProfile: async (
    userId: string,
    payload: unknown,
  ): Promise<UserProfile> => {
    const data = updateUserProfileSchema.parse(payload);

    const updated = await userProfilesRepository.updateByUserId(userId, data);

    if (!updated) {
      throw new UserProfileNotFoundError();
    }

    return updated;
  },

  updateAcademicProfile: async (
    userId: string,
    payload: unknown,
  ): Promise<UserProfile> => {
    const data = updateAcademicProfileSchema.parse(payload);

    const updated = await userProfilesRepository.updateByUserId(userId, data);

    if (!updated) {
      throw new UserProfileNotFoundError();
    }

    return updated;
  },
  /**
   * 更新使用者帳號資料（部分欄位）。
   * @throws {UserProfileNotFoundError} 當該 userId 沒有對應的個人資料時
   */
  updateAccount: async (userId: string, payload: unknown): Promise<User> => {
    const data = updateUserAccountSchema.parse(payload);

    const updated = await usersRepository.updateById(userId, data);

    if (!updated) {
      throw new UserProfileNotFoundError();
    }

    return updated;
  },

  hasRequiredProfileFields: async (userId: string): Promise<boolean> => {
    const profile = await userProfilesRepository.findByUserId(userId);
    if (!profile) {
      return false;
    }

    // 判斷必要欄位是否都有值
    const requiredFields: (keyof UserProfile)[] = ["real_name", "phone"];

    return requiredFields.every((field) => {
      const value = profile[field];
      return value !== null && value !== undefined && value !== "";
    });
  },
};

/**
 * 判斷錯誤是否為 Postgres unique constraint violation（error code 23505）。
 *
 * 注意：repository 層的 throwRepositoryError 可能會把原始 supabase error 包裝過，
 * 這裡同時檢查頂層 `code` 與 `cause.code`，避免因為包裝方式不同而永遠判斷不到。
 * 若確認 throwRepositoryError 不會保留原始 error（也不放進 cause），
 * 建議改成在 repository 層直接偵測 code 並拋出明確的 domain error，
 * 而不是在 service 層猜測包裝後的錯誤形狀。
 */
function isUniqueViolation(error: unknown): boolean {
  const getCode = (value: unknown): string | undefined =>
    typeof value === "object" && value !== null && "code" in value
      ? ((value as { code?: unknown }).code as string | undefined)
      : undefined;

  if (getCode(error) === "23505") {
    return true;
  }

  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? (error as { cause?: unknown }).cause
      : undefined;

  return getCode(cause) === "23505";
}
