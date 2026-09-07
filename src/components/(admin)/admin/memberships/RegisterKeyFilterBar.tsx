import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { QueryFilterDisclosure } from "@/components/query/QueryFilterDisclosure";
import { QueryFilterForm } from "@/components/query/QueryFilterForm";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { buildOwnedQueryHref } from "@/libs/query-navigation";
import type {
  AcademicYear,
  MembershipRegisterKeyStatus,
} from "@/types/database";
import { buildQueryString } from "@/utils/url";

const BASE_PATH = "/admin/memberships/register-keys";

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
  const clearSearchQuery = buildQueryString({
    academic_year_id: query.academic_year_id,
    status: query.status,
    orderBy: query.orderBy,
    orderDirection: query.orderDirection,
    pageSize: query.pageSize,
  });
  const clearSearchHref = clearSearchQuery
    ? BASE_PATH + "?" + clearSearchQuery
    : BASE_PATH;
  const activeFilterCount = [query.academic_year_id, query.status].filter(Boolean).length;
  const clearFiltersHref = buildOwnedQueryHref({
    basePath: BASE_PATH,
    appliedQuery: query,
    ownedKeys: ["academic_year_id", "status"],
    changes: {},
  });

  return (
    <AdminToolbar className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <form method="GET" action={BASE_PATH} aria-label="搜尋社員註冊序號" className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <PreservedQueryFields query={query} ownedKeys={["search"]} />
        <ClearableSearchInput
          id="register-key-search"
          initialValue={query.search}
          clearHref={clearSearchHref}
          name="search"
          placeholder="搜尋社員註冊序號"
          aria-label="搜尋社員註冊序號"
          className="w-full"
        />
        <Button type="submit" variant="primary" className="w-full lg:w-auto">
          搜尋
        </Button>
      </form>
      <QueryFilterDisclosure label={activeFilterCount ? `篩選 (${activeFilterCount})` : "篩選"} panelClassName="lg:min-w-72">
        <QueryFilterForm
          method="GET"
          action={BASE_PATH}
          appliedQuery={query}
          ownedKeys={["academic_year_id", "status"]}
          clearHref={clearFiltersHref}
          className="grid gap-3"
        >
          <PreservedQueryFields query={query} ownedKeys={["academic_year_id", "status"]} />
          <label className="grid gap-1.5 text-sm font-medium text-(--text-primary)">
            學年度
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
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-(--text-primary)">
            狀態
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
          </label>
        </QueryFilterForm>
      </QueryFilterDisclosure>
    </AdminToolbar>
  );
}
