import { cache } from "react";
import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import {
  createUserProfileSchema,
  updateUserProfileSchema,
} from "./users.schema";
import type { UserProfile } from "@/types/database";
import {
  UserProfileAlreadyExistsError,
  UserProfileNotFoundError,
} from "./user.errors";

/**
 * 依 userId 取得社員個人資料。
 * 使用 React `cache()`：同一次 request 的 render tree 中，
 * 若多個 Server Component 都呼叫 getProfile(userId)，只會實際查一次 DB。
 */
const getProfile = cache(
  async (userId: string): Promise<UserProfile | null> => {
    return userProfilesRepository.getUserProfile(userId);
  },
);

export const usersService = {
  getProfile,

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
      return await userProfilesRepository.createUserProfile(userId, data);
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

    const updated = await userProfilesRepository.updateUserProfile(
      userId,
      data,
    );

    if (!updated) {
      throw new UserProfileNotFoundError();
    }

    return updated;
  },
};

/**
 * 判斷錯誤是否為 Postgres unique constraint violation（error code 23505）。
 * Supabase / PostgREST 的錯誤物件通常帶有 `code` 屬性。
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
