import "server-only";

import { supabase } from "@/libs/supabase/server";
import type { UserProfile } from "@/types/database";
import { throwRepositoryError } from "./shared/errors";
import { buildIlikeSearch } from "./shared/search";

export type CreateUserProfileInput = Partial<
  Omit<UserProfile, "id" | "user_id" | "created_at" | "updated_at">
>;

export type UpdateUserProfileInput = Partial<CreateUserProfileInput>;

export const userProfilesRepository = {
  findUserIdsBySearch: async (search: string): Promise<string[]> => {
    const keyword = search.trim();
    if (!keyword) return [];

    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id")
      .or(buildIlikeSearch(["real_name", "student_id"], keyword));

    if (error) throwRepositoryError("依關鍵字取得個人資料用戶 ID 失敗", error);
    return (data ?? []).map((profile) => profile.user_id);
  },

  findManyByUserIds: async (userIds: string[]): Promise<UserProfile[]> => {
    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .in("user_id", userIds);

    if (error) throwRepositoryError("依用戶 ID 批次取得個人資料失敗", error);
    return data ?? [];
  },

  findByUserId: async (userId: string): Promise<UserProfile | null> => {
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

  create: async (
    userId: string,
    payload: CreateUserProfileInput,
  ): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from("user_profiles")
      // 明確以 userId 參數為準，避免 payload 若含有同名欄位而覆蓋掉正確的 user_id
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) {
      throwRepositoryError("建立使用者個人資料失敗", error);
    }

    return data;
  },

  /**
   * @returns 若該 userId 沒有對應的 profile，回傳 null；空 payload 時直接回傳現有資料，不打 update。
   */
  updateByUserId: async (
    userId: string,
    payload: UpdateUserProfileInput,
  ): Promise<UserProfile | null> => {
    if (Object.keys(payload).length === 0) {
      return userProfilesRepository.findByUserId(userId);
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
