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
    <AdminToolbar className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_11rem_9rem_auto] md:items-end">
      <label className="grid w-full gap-1.5 text-sm font-medium">
        搜尋使用者
        <ClearableSearchInput initialValue={query.search} clearHref={clearSearchHref} name="search" placeholder="姓名、學號或 Email" />
      </label>
      <FilterSelect name="academic_year_id" label="學年度" defaultValue={query.academic_year_id}>
        <option value="">全部學年度</option>
        {academicYears.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度</option>)}
      </FilterSelect>
      <FilterSelect name="status" label="狀態" defaultValue={query.status}>
        <option value="">全部狀態</option><option value="active">有效</option><option value="expired">已結束</option><option value="cancelled">已撤銷</option>
      </FilterSelect>
      <Button type="submit" className="w-full md:w-auto">搜尋</Button>
    </AdminToolbar>
  </form>;
}

function FilterSelect({ name, label, defaultValue, children }: { name: string; label: string; defaultValue?: string; children: React.ReactNode }) {
  return <label className="grid w-full gap-1.5 text-sm font-medium"><span>{label}</span><Select name={name} defaultValue={defaultValue ?? ""} className="w-full">{children}</Select></label>;
}
