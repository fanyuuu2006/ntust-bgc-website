import "server-only";
import { Session } from "@/types/database";
import { throwRepositoryError } from "./error";
import { supabase } from "@/libs/supabase/server";

type CreateSessionInput = Pick<Session, "user_id" | "token" | "expires_at">;

export const sessionRepository = {
  create: async (payload: CreateSessionInput): Promise<Session> => {
    const { data, error } = await supabase
      .from("sessions")
      .insert(payload)
      .select()
      .single();
    if (error) throwRepositoryError("建立憑證失敗", error);
    return data;
  },
  findByToken: async (token: string): Promise<Session | null> => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) throwRepositoryError("依 token 尋找憑證失敗", error);
    return data;
  },
  async deleteByToken(token: string): Promise<void> {
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("token", token);

    if (error) throwRepositoryError("刪除憑證失敗", error);
  },
};
