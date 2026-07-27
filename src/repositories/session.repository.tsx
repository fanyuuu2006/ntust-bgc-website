import "server-only";

import { Session } from "@/types/database";
import { throwRepositoryError } from "./error";
import { supabase } from "@/libs/supabase/server";

type CreateSessionInput = Pick<Session, "user_id" | "token" | "expires_at">;

type UpdateSessionInput = Partial<
  Pick<Session, "expires_at" | "last_accessed_at">
>;

export const sessionRepository = {
  /**
   * 建立 Session
   */
  create: async (payload: CreateSessionInput): Promise<Session> => {
    const { data, error } = await supabase
      .from("sessions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throwRepositoryError("建立 Session 失敗", error);
    }

    return data;
  },

  /**
   * 依 Token 尋找 Session
   */
  findByToken: async (token: string): Promise<Session | null> => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      throwRepositoryError("依 Token 尋找 Session 失敗", error);
    }

    return data;
  },

  /**
   * 依 Token 尋找尚未過期的 Session
   */
  findValidByToken: async (token: string): Promise<Session | null> => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      throwRepositoryError("尋找有效 Session 失敗", error);
    }

    return data;
  },

  clearExpiredSessions: async (): Promise<void> => {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) {
      throwRepositoryError("清除過期 Session 失敗", error);
    }
  },

  /**
   * 更新 Session
   */
  updateById: async (
    id: string,
    payload: UpdateSessionInput,
  ): Promise<Session> => {
    const { data, error } = await supabase
      .from("sessions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throwRepositoryError("更新 Session 失敗", error);
    }

    return data;
  },

  /**
   * 刪除指定 Token 的 Session
   */
  deleteByToken: async (token: string): Promise<void> => {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("token", token);

    if (error) {
      throwRepositoryError("刪除 Session 失敗", error);
    }
  },

  /**
   * 刪除使用者所有 Session
   */
  deleteByUserId: async (userId: string): Promise<void> => {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("user_id", userId);

    if (error) {
      throwRepositoryError("刪除使用者所有 Session 失敗", error);
    }
  },
};
