"use client";

import { usePathname, useRouter } from "next/navigation";

import type { AcademicYear, MembershipRegisterKeyStatus } from "@/types/database";
import { buildQueryString } from "@/utils/url";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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
      <Field label="搜尋序號" htmlFor="register-key-search">
        <Input
          id="register-key-search"
          name="search"
          defaultValue={query.search}
          placeholder="114NTUSTBGC 或完整序號"
        />
      </Field>

      <Field label="學年度" htmlFor="register-key-year-filter">
        <Select
          id="register-key-year-filter"
          name="academic_year_id"
          defaultValue={query.academic_year_id ?? ""}
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
        >
          <option value="">全部</option>
          <option value="available">可使用</option>
          <option value="claimed">已啟用</option>
          <option value="revoked">已作廢</option>
          <option value="expired">已過期</option>
        </Select>
      </Field>

      <Button
        type="submit"
        className="rounded-md"
      >
        搜尋
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!hasFilters}
        onClick={() => router.push(pathname)}
        className="rounded-md"
      >
        清除
      </Button>
    </form>
  );
}
