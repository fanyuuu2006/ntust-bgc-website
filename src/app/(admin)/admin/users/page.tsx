import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { usersService } from "@/services/users/users.service";
import {
  normalizePageSizeOption,
  readSingleQueryValue,
  type QueryParamValue,
} from "@/libs/query-params";
import { formatDateTime } from "@/utils/date";
import { parsePage } from "@/utils/pagination";
import { EmailVerificationBadge } from "@/components/(admin)/admin/users/EmailVerificationBadge";
import { normalizeAdminUserEmailVerification } from "./query";

type Props = {
  searchParams: Promise<{
    search?: QueryParamValue;
    page?: QueryParamValue;
    pageSize?: QueryParamValue;
    orderBy?: QueryParamValue;
    orderDirection?: QueryParamValue;
    emailVerification?: QueryParamValue;
  }>;
};

const BASE_PATH = "/admin/users";
const SORT_FIELDS = ["name", "created_at"] as const;
const MISSING_VALUE = "尚未填寫";

export default async function AdminUsersPage({ searchParams }: Props) {
  const rawParams = await searchParams;
  const params = {
    search: readSingleQueryValue(rawParams.search),
    page: readSingleQueryValue(rawParams.page),
    pageSize: readSingleQueryValue(rawParams.pageSize),
    orderBy: readSingleQueryValue(rawParams.orderBy),
    orderDirection: readSingleQueryValue(rawParams.orderDirection),
    emailVerification: normalizeAdminUserEmailVerification(
      rawParams.emailVerification,
    ),
  };
  const page = parsePage(params.page);
  const pageSize = normalizePageSizeOption(params.pageSize, [10, 20, 50, 100], 20);
  const orderBy = SORT_FIELDS.includes(
    params.orderBy as (typeof SORT_FIELDS)[number],
  )
    ? (params.orderBy as (typeof SORT_FIELDS)[number])
    : "created_at";
  const orderDirection = params.orderDirection === "asc" ? "asc" : "desc";
  const users = await usersService.listForAdmin({
    page,
    pageSize,
    search: params.search?.trim() || undefined,
    emailVerification: params.emailVerification,
    orderBy,
    orderDirection,
  });
  const query = {
    search: params.search,
    page: String(page),
    pageSize: String(pageSize),
    orderBy,
    orderDirection,
    emailVerification: params.emailVerification,
  };
  const clearSearchParams = new URLSearchParams();
  if (params.orderBy) clearSearchParams.set("orderBy", params.orderBy);
  if (params.orderDirection) {
    clearSearchParams.set("orderDirection", params.orderDirection);
  }
  if (params.pageSize) clearSearchParams.set("pageSize", params.pageSize);
  if (params.emailVerification) {
    clearSearchParams.set("emailVerification", params.emailVerification);
  }
  const clearSearchHref = clearSearchParams.size
    ? BASE_PATH + "?" + clearSearchParams
    : BASE_PATH;

  return (
    <>
      <HeadingSection
        title="使用者管理"
        description="管理網站帳號與個人基本資料。"
      />

      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <AdminToolbar className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center">
          <form
            className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            aria-label="搜尋使用者"
          >
            <PreservedQueryFields query={query} ownedKeys={["search"]} />
            <ClearableSearchInput
              initialValue={params.search}
              clearHref={clearSearchHref}
              name="search"
              placeholder="搜尋使用者名稱、姓名、Email 或學號"
              aria-label="搜尋使用者"
              className="w-full sm:flex-1"
            />
            <Button type="submit" variant="primary" className="w-full sm:w-auto">
              搜尋
            </Button>
          </form>
          <ImmediateQuerySelect
            appliedQuery={query}
            basePath={BASE_PATH}
            queryKey="emailVerification"
            value={params.emailVerification ?? ""}
            aria-label="Email 驗證狀態"
            className="w-full"
          >
            <option value="">全部驗證狀態</option>
            <option value="verified">已驗證</option>
            <option value="unverified">尚未驗證</option>
          </ImmediateQuerySelect>
        </AdminToolbar>

        {users.data.length === 0 &&
        Boolean(params.search?.trim() || params.emailVerification || page > 1) ? (
          <QueryEmptyState
            title="找不到符合條件的使用者"
            description="請調整搜尋條件後再試。"
            clearHref={BASE_PATH}
          />
        ) : users.data.length === 0 ? (
          <EmptyState
            title="目前沒有使用者"
          />
        ) : (
          <>
            <div className="grid gap-3 lg:hidden">
              {users.data.map((user) => (
                <Card key={user.id} className="space-y-3 p-4">
                  <div className="min-w-0">
                    <p className="text-xs text-(--text-muted)">使用者名稱</p>
                    <p className="mt-0.5 font-semibold">{user.name}</p>
                    <p className="mt-2 text-xs text-(--text-muted)">真實姓名</p>
                    <p className="mt-0.5">{user.profile?.real_name || MISSING_VALUE}</p>
                    <p className="mt-2 break-all text-sm text-(--text-muted)">
                      {user.email}
                    </p>
                    <div className="mt-2">
                      <EmailVerificationBadge
                        verifiedAt={user.email_verified_at}
                      />
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <Info label="學號" value={user.profile?.student_id || MISSING_VALUE} />
                    <Info
                      label="系所／年級"
                      value={formatDepartmentGrade(
                        user.profile?.department,
                        user.profile?.grade,
                      )}
                    />
                    <Info label="建立時間" value={formatDateTime(user.created_at)} />
                  </dl>
                  <ButtonLink
                    href={"/admin/users/" + user.id}
                    variant="outline"
                    size="sm"
                  >
                    查看
                  </ButtonLink>
                </Card>
              ))}
            </div>

            <AdminListSection className="hidden lg:block">
              <Table className="min-w-272">
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      label="使用者名稱"
                      column="name"
                      basePath={BASE_PATH}
                      query={query}
                    />
                    <TableHead>真實姓名</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Email 驗證</TableHead>
                    <TableHead>學號</TableHead>
                    <TableHead>系所／年級</TableHead>
                    <SortableTableHeader
                      label="建立時間"
                      column="created_at"
                      basePath={BASE_PATH}
                      query={query}
                    />
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.profile?.real_name || MISSING_VALUE}</TableCell>
                      <TableCell className="max-w-56 break-all text-(--text-muted)">
                        {user.email}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <EmailVerificationBadge
                          verifiedAt={user.email_verified_at}
                        />
                      </TableCell>
                      <TableCell>{user.profile?.student_id || MISSING_VALUE}</TableCell>
                      <TableCell>
                        {formatDepartmentGrade(
                          user.profile?.department,
                          user.profile?.grade,
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ButtonLink
                          href={"/admin/users/" + user.id}
                          variant="outline"
                          size="sm"
                        >
                          查看
                        </ButtonLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AdminListSection>
          </>
        )}

        <Pagination
          className="p-4"
          page={page}
          pageSize={pageSize}
          total={users.total}
          totalPages={users.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={[10, 20, 50, 100]}
          query={query}
        />
      </section>
    </>
  );
}

function formatDepartmentGrade(
  department: string | null | undefined,
  grade: string | null | undefined,
) {
  return [department, grade].filter(Boolean).join(" ／ ") || MISSING_VALUE;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-(--text-muted)">{label}</dt>
      <dd className="mt-0.5 wrap-break-word">{value}</dd>
    </div>
  );
}
