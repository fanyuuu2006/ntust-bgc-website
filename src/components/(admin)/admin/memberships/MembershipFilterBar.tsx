import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { QueryFilterDisclosure } from "@/components/query/QueryFilterDisclosure";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { AcademicYear, MembershipStatus } from "@/types/database";
import { buildQueryString } from "@/utils/url";

const BASE_PATH = "/admin/memberships";

type Props = {
  academicYears: AcademicYear[];
  query: {
    search?: string;
    academic_year_id?: string;
    status?: MembershipStatus;
    orderBy?: "joined_at" | "created_at" | "status";
    orderDirection?: "asc" | "desc";
    pageSize?: number;
  };
};

export function MemberFilterBar({ academicYears, query }: Props) {
  const clearSearchQuery = buildQueryString({
    academic_year_id: query.academic_year_id,
    status: query.status,
    orderBy: query.orderBy,
    orderDirection: query.orderDirection,
    pageSize: query.pageSize,
  });
  const clearSearchHref = clearSearchQuery ? `${BASE_PATH}?${clearSearchQuery}` : BASE_PATH;

  return (
    <form method="GET" action={BASE_PATH}>
      <input type="hidden" name="page" value="1" />
      <input type="hidden" name="pageSize" value={query.pageSize ?? 20} />
      {query.orderBy ? <input type="hidden" name="orderBy" value={query.orderBy} /> : null}
      {query.orderDirection ? <input type="hidden" name="orderDirection" value={query.orderDirection} /> : null}
      <AdminToolbar className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <ClearableSearchInput
          initialValue={query.search}
          clearHref={clearSearchHref}
          name="search"
          placeholder="搜尋使用者姓名、學號或 Email"
          aria-label="搜尋使用者"
          className="w-full"
        />
        <Button type="submit" variant="primary" className="w-full lg:w-auto">
          搜尋
        </Button>
        <QueryFilterDisclosure panelClassName="lg:min-w-72">
          <FilterSelect name="academic_year_id" label="學年度" defaultValue={query.academic_year_id}>
            <option value="">全部學年度</option>
            {academicYears.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度</option>)}
          </FilterSelect>
          <FilterSelect name="status" label="狀態" defaultValue={query.status}>
            <option value="">全部狀態</option><option value="active">有效</option><option value="expired">已結束</option><option value="cancelled">已撤銷</option>
          </FilterSelect>
        </QueryFilterDisclosure>
      </AdminToolbar>
    </form>
  );
}

function FilterSelect({ name, label, defaultValue, children }: { name: string; label: string; defaultValue?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-(--text-primary)">
      {label}
      <Select name={name} defaultValue={defaultValue ?? ""} className="w-full">
        {children}
      </Select>
    </label>
  );
}
