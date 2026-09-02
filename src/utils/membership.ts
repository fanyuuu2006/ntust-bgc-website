import type { MembershipStatus, MembershipType } from "@/types/database";

export const MEMBERSHIP_TYPE_LABEL: Record<MembershipType, string> = {
  annual: "一般社員",
  lifetime: "終生社員",
};

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  pending: "處理中",
  active: "生效中",
  expired: "已失效",
  suspended: "已停用",
  cancelled: "已取消",
};

const MEMBERSHIP_TYPE_SEARCH_TERMS: Record<MembershipType, readonly string[]> = {
  annual: ["一般", "annual"],
  lifetime: ["終生", "lifetime"],
};

const MEMBERSHIP_STATUS_SEARCH_TERMS: Record<MembershipStatus, readonly string[]> = {
  pending: ["處理", "pending"],
  active: ["生效", "有效", "active"],
  expired: ["失效", "到期", "expired"],
  suspended: ["停用", "suspended"],
  cancelled: ["取消", "cancelled"],
};

export function matchesMembershipRecordSearch(
  record: {
    type: MembershipType;
    status: MembershipStatus;
    academic_year: { year: string } | null;
  },
  search: string | undefined,
) {
  const normalized = search?.trim().toLowerCase();
  if (!normalized) return true;

  return [
    record.academic_year?.year,
    MEMBERSHIP_TYPE_LABEL[record.type],
    MEMBERSHIP_STATUS_LABEL[record.status],
    ...MEMBERSHIP_TYPE_SEARCH_TERMS[record.type],
    ...MEMBERSHIP_STATUS_SEARCH_TERMS[record.status],
  ].some((value) => value?.toLowerCase().includes(normalized));
}
