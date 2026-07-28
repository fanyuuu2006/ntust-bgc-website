import { UserProfile } from "@/types/database";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "./error";

type UserProfileInput = Partial<UserProfile>;

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
    payload: UserProfileInput,
  ): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from("user_profiles")
      .insert({
        user_id: userId,
        ...payload,
      })
      .select()
      .single();

    if (error) {
      throwRepositoryError("建立使用者個人資料失敗", error);
    }

    return data;
  },

  updateUserProfile: async (
    userId: string,
    payload: UserProfileInput,
  ): Promise<UserProfile> => {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throwRepositoryError("更新使用者個人資料失敗", error);
    }

    return data;
  },
};
