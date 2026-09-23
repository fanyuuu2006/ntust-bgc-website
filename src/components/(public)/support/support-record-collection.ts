import type { SupportRecord } from "@/types/database";
import {
  getSupportRecordStatus,
  type SupportRecordStatus,
} from "./support-record-status";

export type SupportRecordSort = "paid-desc" | "paid-asc" | "status";

type CollectionOptions = {
  query: string;
  status: "all" | SupportRecordStatus;
  sort: SupportRecordSort;
};

const statusOrder: Record<SupportRecordStatus, number> = {
  "awaiting-consent": 0,
  "ready-to-publish": 1,
  published: 2,
  withdrawn: 3,
  refunded: 4,
};

export function filterAndSortSupportRecords(
  records: SupportRecord[],
  { query, status, sort }: CollectionOptions,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = records.filter((record) => {
    const matchesStatus = status === "all" || getSupportRecordStatus(record) === status;
    if (!matchesStatus) return false;
    if (!normalizedQuery) return true;

    return [
      record.provider,
      record.provider_transaction_reference,
      record.public_display_name ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });

  return filtered.toSorted((left, right) => {
    if (sort === "status") {
      const statusDifference = statusOrder[getSupportRecordStatus(left)] - statusOrder[getSupportRecordStatus(right)];
      if (statusDifference !== 0) return statusDifference;
    }

    const paidAtDifference = Date.parse(left.paid_at) - Date.parse(right.paid_at);
    if (paidAtDifference !== 0) return sort === "paid-asc" ? paidAtDifference : -paidAtDifference;
    return left.id.localeCompare(right.id);
  });
}

export function getSupportRecordSummary({
  loadedCount,
  resultCount,
  filtered,
}: {
  loadedCount: number;
  resultCount: number;
  filtered: boolean;
}) {
  if (loadedCount === 100) {
    return filtered
      ? `最近 100 筆中顯示 ${resultCount} 筆支持紀錄`
      : "顯示最近 100 筆支持紀錄";
  }
  return filtered
    ? `顯示 ${resultCount} / ${loadedCount} 筆支持紀錄`
    : `共 ${loadedCount} 筆支持紀錄`;
}
