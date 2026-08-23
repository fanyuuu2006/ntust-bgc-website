"use client";

import { usePathname, useRouter } from "next/navigation";

import type { AcademicYear, MembershipRegisterKeyStatus } from "@/types/database";
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
  const hasFilters = Boolean(query.search || query.academic_year_id || query.status);

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

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_auto_auto] lg:items-end"
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-(--foreground)">
        搜尋序號
        <input
          name="search"
          defaultValue={query.search}
          placeholder="114NTUSTBGC 或完整序號"
          className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm outline-none focus:border-(--primary)"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-(--foreground)">
        學年度
        <select
          name="academic_year_id"
          defaultValue={query.academic_year_id ?? ""}
          className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm outline-none focus:border-(--primary)"
        >
          <option value="">全部</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.year} 學年度
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-(--foreground)">
        狀態
        <select
          name="status"
          defaultValue={query.status ?? ""}
          className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm outline-none focus:border-(--primary)"
        >
          <option value="">全部</option>
          <option value="available">可使用</option>
          <option value="claimed">已啟用</option>
          <option value="revoked">已作廢</option>
          <option value="expired">已過期</option>
        </select>
      </label>

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
