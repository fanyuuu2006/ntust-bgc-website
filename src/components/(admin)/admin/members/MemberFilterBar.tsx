"use client";

import { usePathname, useRouter } from "next/navigation";

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

export function MemberFilterBar({ academicYears, query }: MemberFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hasFilters = Boolean(
    query.search || query.academic_year_id || query.type || query.status,
  );

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
      page: undefined,
    });

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_10rem_9rem_9rem_auto_auto] lg:items-end"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-(--foreground)">
        搜尋社員
        <input
          name="search"
          defaultValue={query.search}
          placeholder="姓名、Email、學號"
          className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm outline-none focus:border-(--primary)"
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
        <option value="annual">一般社員</option>
        <option value="lifetime">永久社員</option>
      </FilterSelect>

      <FilterSelect name="status" label="狀態" defaultValue={query.status}>
        <option value="">全部</option>
        <option value="active">有效</option>
        <option value="pending">處理中</option>
        <option value="expired">已過期</option>
        <option value="suspended">已停權</option>
        <option value="cancelled">已取消</option>
      </FilterSelect>

      <button
        type="submit"
        className="btn primary rounded-md px-4 py-2 text-sm font-medium"
      >
        搜尋
      </button>
      <button
        type="button"
        disabled={!hasFilters}
        onClick={() => router.push(pathname)}
        className="btn outline rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        清除
      </button>
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
    <label className="flex flex-col gap-1.5 text-sm font-medium text-(--foreground)">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm outline-none focus:border-(--primary)"
      >
        {children}
      </select>
    </label>
  );
}
