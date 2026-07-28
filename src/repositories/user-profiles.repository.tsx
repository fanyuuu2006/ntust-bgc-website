import "server-only";
import { UserProfile } from "@/types/database";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "./error";

/**
 * 可寫入的 profile 欄位。
 * `id` / `user_id` / `created_at` / `updated_at` 等系統欄位。
 */
type UserProfileWritableInput = Partial<
  Omit<UserProfile, "id" | "user_id" | "created_at" | "updated_at">
>;

export const userProfilesRepository = {
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throwRepositoryError("取得使用者個人資料失敗", error);
    }

    return data;
  },

  createUserProfile: async (
    userId: string,
    payload: UserProfileWritableInput,
  ): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from("user_profiles")
      // 明確以 user_id 參數為準，避免 payload 若含有同名欄位而覆蓋掉正確的 userId
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) {
      throwRepositoryError("建立使用者個人資料失敗", error);
    }

    return data;
  },

  /**
   * 更新使用者個人資料。
   * @returns 若該 userId 沒有對應的 profile，回傳 null；空 payload 時直接回傳現有資料，不打 update。
   */
  updateUserProfile: async (
    userId: string,
    payload: UserProfileWritableInput,
  ): Promise<UserProfile | null> => {
    if (Object.keys(payload).length === 0) {
      return userProfilesRepository.getUserProfile(userId);
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      throwRepositoryError("更新使用者個人資料失敗", error);
    }

    return data;
  },
};
