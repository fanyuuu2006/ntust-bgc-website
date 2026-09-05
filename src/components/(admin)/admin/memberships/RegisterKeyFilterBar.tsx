"use client";

import { usePathname, useRouter } from "next/navigation";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type {
  AcademicYear,
  MembershipRegisterKeyStatus,
} from "@/types/database";
import { buildQueryString } from "@/utils/url";

type RegisterKeyFilterBarProps = {
  academicYears: AcademicYear[];
  query: {
    search?: string;
    academic_year_id?: string;
    status?: MembershipRegisterKeyStatus;
    orderBy?: "created_at" | "claimed_at" | "sequence_number";
    orderDirection?: "asc" | "desc";
    pageSize?: number;
  };
};

export function RegisterKeyFilterBar({
  academicYears,
  query,
}: RegisterKeyFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const clearSearchQuery = buildQueryString({
    academic_year_id: query.academic_year_id,
    status: query.status,
    orderBy: query.orderBy,
    orderDirection: query.orderDirection,
    pageSize: query.pageSize,
  });
  const clearSearchHref = clearSearchQuery
    ? pathname + "?" + clearSearchQuery
    : pathname;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const queryString = buildQueryString({
      search: String(form.get("search") ?? "").trim() || undefined,
      academic_year_id:
        String(form.get("academic_year_id") ?? "").trim() || undefined,
      status: String(form.get("status") ?? "").trim() || undefined,
      orderBy: query.orderBy,
      orderDirection: query.orderDirection,
      pageSize: query.pageSize,
      page: "1",
    });
    router.push(queryString ? pathname + "?" + queryString : pathname);
  }

  return (
    <form onSubmit={handleSubmit}>
      <AdminToolbar className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_auto] md:items-center">
        <ClearableSearchInput
          id="register-key-search"
          initialValue={query.search}
          clearHref={clearSearchHref}
          name="search"
          placeholder="搜尋社員註冊序號"
          aria-label="搜尋社員註冊序號"
          className="w-full md:col-span-2 lg:col-span-1"
        />
        <Button type="submit" variant="primary" className="order-2 w-full md:order-4 md:col-span-2 md:justify-self-end md:w-auto lg:col-span-1">
          搜尋
        </Button>
        <Select
          id="register-key-year-filter"
          name="academic_year_id"
          aria-label="學年度"
          defaultValue={query.academic_year_id ?? ""}
          className="order-3 w-full"
        >
            <option value="">全部</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year} 學年度
              </option>
            ))}
        </Select>
        <Select
          id="register-key-status-filter"
          name="status"
          aria-label="狀態"
          defaultValue={query.status ?? ""}
          className="order-3 w-full"
        >
            <option value="">全部</option>
            <option value="available">可使用</option>
            <option value="claimed">已使用</option>
            <option value="revoked">已撤銷</option>
            <option value="expired">已過期</option>
        </Select>
      </AdminToolbar>
    </form>
  );
}
