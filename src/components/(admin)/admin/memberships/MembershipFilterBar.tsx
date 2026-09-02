"use client";

import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { AcademicYear, MembershipStatus } from "@/types/database";
import { buildQueryString } from "@/utils/url";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  academicYears: AcademicYear[];
  query: {
    search?: string;
    academic_year_id?: string;
    status?: MembershipStatus;
    pageSize?: number;
  };
};

export function MemberFilterBar({ academicYears, query }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const clearSearchQuery = buildQueryString({
    academic_year_id: query.academic_year_id,
    status: query.status,
    pageSize: query.pageSize,
  });
  const clearSearchHref = clearSearchQuery ? `${pathname}?${clearSearchQuery}` : pathname;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const queryString = buildQueryString({
      search: String(formData.get("search") ?? "").trim() || undefined,
      academic_year_id: String(formData.get("academic_year_id") ?? "").trim() || undefined,
      status: String(formData.get("status") ?? "").trim() || undefined,
      pageSize: query.pageSize,
      page: "1",
    });
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return <form onSubmit={handleSubmit}>
    <AdminToolbar className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_9rem_auto] md:items-center">
      <ClearableSearchInput initialValue={query.search} clearHref={clearSearchHref} name="search" placeholder="搜尋使用者姓名、學號或 Email" aria-label="搜尋使用者" className="w-full md:col-span-2 lg:col-span-1" />
      <Button type="submit" variant="primary" className="order-2 w-full md:order-4 md:col-span-2 md:justify-self-end md:w-auto lg:col-span-1">搜尋</Button>
      <FilterSelect name="academic_year_id" ariaLabel="學年度" defaultValue={query.academic_year_id}>
        <option value="">全部學年度</option>
        {academicYears.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度</option>)}
      </FilterSelect>
      <FilterSelect name="status" ariaLabel="狀態" defaultValue={query.status}>
        <option value="">全部狀態</option><option value="active">有效</option><option value="expired">已結束</option><option value="cancelled">已撤銷</option>
      </FilterSelect>
    </AdminToolbar>
  </form>;
}

function FilterSelect({ name, ariaLabel, defaultValue, children }: { name: string; ariaLabel: string; defaultValue?: string; children: React.ReactNode }) {
  return <Select name={name} aria-label={ariaLabel} defaultValue={defaultValue ?? ""} className="order-3 w-full">{children}</Select>;
}
