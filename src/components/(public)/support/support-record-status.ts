import type { SupportRecord } from "@/types/database";

export type SupportRecordStatus =
  | "awaiting-consent"
  | "ready-to-publish"
  | "published"
  | "withdrawn"
  | "refunded";

type SupportRecordStatusSource = Pick<
  SupportRecord,
  | "payment_status"
  | "public_display_name"
  | "public_consent_at"
  | "published_at"
  | "withdrawn_at"
>;

export function getSupportRecordStatus(
  record: SupportRecordStatusSource,
): SupportRecordStatus {
  if (record.payment_status === "refunded") return "refunded";
  if (record.withdrawn_at) return "withdrawn";
  if (record.published_at) return "published";
  if (record.public_consent_at && record.public_display_name) {
    return "ready-to-publish";
  }
  return "awaiting-consent";
}
