"use client";

import { usePathname, useRouter } from "next/navigation";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type {
  AcademicYear,
  MembershipStatus,
  MembershipType,
} from "@/types/database";
import { buildQueryString } from "@/utils/url";

type MemberFilterBarProps = {
  academicYears: AcademicYear[];
  query: {
    search?: string;
    academic_year_id?: string;
    type?: MembershipType;
    status?: MembershipStatus;
    pageSize?: number;
  };
};

export function MemberFilterBar({
  academicYears,
  query,
}: MemberFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const clearSearchQuery = buildQueryString({
    academic_year_id: query.academic_year_id,
    type: query.type,
    status: query.status,
    pageSize: query.pageSize,
  });
  const clearSearchHref = clearSearchQuery
    ? pathname + "?" + clearSearchQuery
    : pathname;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const queryString = buildQueryString({
      search: String(formData.get("search") ?? "").trim() || undefined,
      academic_year_id:
        String(formData.get("academic_year_id") ?? "").trim() || undefined,
      type: String(formData.get("type") ?? "").trim() || undefined,
      status: String(formData.get("status") ?? "").trim() || undefined,
      pageSize: query.pageSize,
      page: "1",
    });
    router.push(queryString ? pathname + "?" + queryString : pathname);
  }

  return (
    <form onSubmit={handleSubmit}>
      <AdminToolbar className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_9rem_9rem_auto] lg:items-end">
        <label className="grid w-full gap-1.5 text-sm font-medium md:col-span-2 lg:col-span-1">
          搜尋社員資格
          <ClearableSearchInput
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="姓名、學號或 Email"
          />
        </label>
        <FilterSelect
          name="academic_year_id"
          label="學年度"
          defaultValue={query.academic_year_id}
        >
          <option value="">全部</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.year} 學年度
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="type" label="類型" defaultValue={query.type}>
          <option value="">全部</option>
          <option value="annual">年度社員</option>
          <option value="lifetime">終身社員</option>
        </FilterSelect>
        <FilterSelect name="status" label="狀態" defaultValue={query.status}>
          <option value="">全部</option>
          <option value="active">有效</option>
          <option value="pending">待處理</option>
          <option value="expired">已過期</option>
          <option value="suspended">停權</option>
          <option value="cancelled">已取消</option>
        </FilterSelect>
        <Button type="submit" className="w-full md:w-auto">
          搜尋
        </Button>
      </AdminToolbar>
    </form>
  );
}

function FilterSelect({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid w-full gap-1.5 text-sm font-medium">
      {label}
      <Select name={name} defaultValue={defaultValue ?? ""} className="w-full">
        {children}
      </Select>
    </label>
  );
}
