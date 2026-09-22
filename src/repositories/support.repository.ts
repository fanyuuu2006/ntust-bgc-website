import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import type { SupportRecord } from "@/types/database";
import { DuplicateSupportReferenceError } from "@/services/support/support.errors";

// Select only public fields. This query must never be replaced with `select("*")`.
const PUBLIC_SUPPORTER_FIELDS = "public_display_name";
const MAX_PUBLIC_SUPPORTERS = 200;
const PRIVATE_FIELDS = "id,provider,provider_transaction_reference,payment_status,paid_at,public_display_name,public_consent_at,public_consent_method,published_at,withdrawn_at,created_at,updated_at";

function throwSupportError(context: string, error: { code?: string }): never {
  // Provider responses can contain transaction references; never pass their
  // detail/message text to observability.
  return throwRepositoryError(context, { code: error.code });
}

export const supportRepository = {
  listPrivate: async (): Promise<SupportRecord[]> => {
    const { data, error } = await supabase.from("support_records")
      .select(PRIVATE_FIELDS)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throwSupportError("讀取支持紀錄失敗", error);
    return (data ?? []) as SupportRecord[];
  },

  createVerified: async (input: { provider: string; reference: string; paidAt: string }): Promise<SupportRecord> => {
    const { data, error } = await supabase.from("support_records")
      .insert({
        provider: input.provider,
        provider_transaction_reference: input.reference,
        paid_at: input.paidAt,
        payment_status: "paid",
      })
      .select(PRIVATE_FIELDS).single();
    if (error?.code === "23505") throw new DuplicateSupportReferenceError();
    if (error) throwSupportError("新增支持紀錄失敗", error);
    return data as SupportRecord;
  },

  updateConsent: async (id: string, input: { name: string; method: string; at: string }): Promise<SupportRecord | null> => {
    const { data, error } = await supabase.from("support_records")
      .update({
        public_display_name: input.name,
        public_consent_at: input.at,
        public_consent_method: input.method,
        published_at: null,
        withdrawn_at: null,
      })
      .eq("id", id).eq("payment_status", "paid")
      .select(PRIVATE_FIELDS).maybeSingle();
    if (error) throwSupportError("紀錄公開同意失敗", error);
    return data as SupportRecord | null;
  },

  publish: async (id: string, at: string): Promise<SupportRecord | null> => {
    const { data, error } = await supabase.from("support_records")
      .update({ published_at: at })
      .eq("id", id).eq("payment_status", "paid")
      .not("public_consent_at", "is", null)
      .not("public_display_name", "is", null)
      .is("published_at", null)
      .is("withdrawn_at", null)
      .select(PRIVATE_FIELDS).maybeSingle();
    if (error) throwSupportError("發布支持者失敗", error);
    return data as SupportRecord | null;
  },

  withdraw: async (id: string, at: string): Promise<SupportRecord | null> => {
    const { data, error } = await supabase.from("support_records")
      .update({
        public_display_name: null,
        public_consent_at: null,
        public_consent_method: null,
        published_at: null,
        withdrawn_at: at,
      })
      .eq("id", id)
      .select(PRIVATE_FIELDS).maybeSingle();
    if (error) throwSupportError("撤下公開支持者失敗", error);
    return data as SupportRecord | null;
  },

  markRefunded: async (id: string): Promise<SupportRecord | null> => {
    const { data, error } = await supabase.from("support_records")
      .update({ payment_status: "refunded", published_at: null })
      .eq("id", id).eq("payment_status", "paid")
      .select(PRIVATE_FIELDS).maybeSingle();
    if (error) throwSupportError("標記退款失敗", error);
    return data as SupportRecord | null;
  },

  listPublicSupporters: async (): Promise<Array<{ public_display_name: string }>> => {
    const { data, error } = await supabase
      .from("support_records")
      .select(PUBLIC_SUPPORTER_FIELDS)
      .eq("payment_status", "paid")
      .not("public_consent_at", "is", null)
      .not("public_display_name", "is", null)
      .not("published_at", "is", null)
      .is("withdrawn_at", null)
      .order("published_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(MAX_PUBLIC_SUPPORTERS);

    if (error) throwSupportError("讀取公開支持者名單失敗", error);
    return (data ?? []) as Array<{ public_display_name: string }>;
  },
};
