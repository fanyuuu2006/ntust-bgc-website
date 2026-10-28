import "server-only";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import type { EventTemplate } from "@/types/database";

export const eventTemplatesRepository = {
  findMany: async (): Promise<EventTemplate[]> => {
    const { data, error } = await supabase.from("event_templates").select("*").order("updated_at", { ascending: false });
    if (error) throwRepositoryError("讀取活動範本失敗", error);
    return data ?? [];
  },
  findById: async (id: string): Promise<EventTemplate | null> => {
    const { data, error } = await supabase.from("event_templates").select("*").eq("id", id).maybeSingle();
    if (error) throwRepositoryError("讀取活動範本失敗", error);
    return data;
  },
  create: async (payload: Omit<EventTemplate, "id" | "created_at" | "updated_at">): Promise<EventTemplate> => {
    const { data, error } = await supabase.from("event_templates").insert(payload).select().single();
    if (error) throwRepositoryError("建立活動範本失敗", error);
    return data;
  },
  updateById: async (id: string, payload: Partial<Omit<EventTemplate, "id" | "created_at" | "updated_at">>): Promise<EventTemplate | null> => {
    const { data, error } = await supabase.from("event_templates").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle();
    if (error) throwRepositoryError("更新活動範本失敗", error);
    return data;
  },
  deleteById: async (id: string): Promise<void> => {
    const { error } = await supabase.from("event_templates").delete().eq("id", id);
    if (error) throwRepositoryError("刪除活動範本失敗", error);
  },
};
