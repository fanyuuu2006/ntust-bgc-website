import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { SupportRecord } from "@/types/database";
import {
  getSupportRecordStatus,
  type SupportRecordStatus,
} from "./support-record-status";

export const supportRecordStatusLabels: Record<SupportRecordStatus, string> = {
  "awaiting-consent": "待取得同意",
  "ready-to-publish": "待發布",
  published: "已公開",
  withdrawn: "已撤下",
  refunded: "已退款",
};

const statusTones: Record<SupportRecordStatus, BadgeTone> = {
  "awaiting-consent": "warning",
  "ready-to-publish": "info",
  published: "success",
  withdrawn: "neutral",
  refunded: "danger",
};

export function SupportRecordStatusBadge({ record }: { record: SupportRecord }) {
  const status = getSupportRecordStatus(record);
  return <Badge tone={statusTones[status]}>{supportRecordStatusLabels[status]}</Badge>;
}
