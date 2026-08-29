"use client";

import { usePathname, useRouter } from "next/navigation";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
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
      pageSize: query.pageSize,
      page: undefined,
    });
    router.push(queryString ? pathname + "?" + queryString : pathname);
  }

  return (
    <form onSubmit={handleSubmit}>
      <AdminToolbar className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_auto] lg:items-end">
        <Field
          label="搜尋註冊碼"
          htmlFor="register-key-search"
          className="w-full md:col-span-2 lg:col-span-1"
        >
          <ClearableSearchInput
            id="register-key-search"
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="例如：114NTUSTBGC"
          />
        </Field>

        <Field label="學年度" htmlFor="register-key-year-filter">
          <Select
            id="register-key-year-filter"
            name="academic_year_id"
            defaultValue={query.academic_year_id ?? ""}
            className="w-full"
          >
            <option value="">全部</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.year} 學年度
              </option>
            ))}
          </Select>
        </Field>

        <Field label="狀態" htmlFor="register-key-status-filter">
          <Select
            id="register-key-status-filter"
            name="status"
            defaultValue={query.status ?? ""}
            className="w-full"
          >
            <option value="">全部</option>
            <option value="available">可使用</option>
            <option value="claimed">已使用</option>
            <option value="revoked">已撤銷</option>
            <option value="expired">已過期</option>
          </Select>
        </Field>

        <Button type="submit" className="w-full md:w-auto">
          搜尋
        </Button>
      </AdminToolbar>
    </form>
  );
}
