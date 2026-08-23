import Link from "next/link";

import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { MemberFilterBar } from "@/components/(admin)/admin/members/MemberFilterBar";
import { MemberTable } from "@/components/(admin)/admin/members/MemberTable";
import { Pagination } from "@/components/Pagination/Pagination";
import { listAdminMembershipsQuerySchema } from "@/services/memberships/memberships.schema";
import { membershipService } from "@/services/memberships/memberships.service";

const BASE_PATH = "/admin/members";
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type MembersAdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MembersAdminPage({
  searchParams,
}: MembersAdminPageProps) {
  const rawQuery = await searchParams;
  const parsedQuery = listAdminMembershipsQuerySchema.safeParse(rawQuery);
  const query = parsedQuery.success ? parsedQuery.data : {};
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const hasFilters = Boolean(
    query.search || query.academic_year_id || query.type || query.status,
  );
  const [academicYears, memberships] = await Promise.all([
    membershipService.listAcademicYears(),
    membershipService.listAdminMemberships({ ...query, page, pageSize }),
  ]);

  return (
    <>
      <HeadingSection
        title="社員管理"
        description="查看真正存在的社員資格、帳號資料與各學年度狀態。"
        actions={
          <Link
            href="/admin/members/register-keys"
            className="btn outline inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            管理註冊序號
          </Link>
        }
      />

      <section className="space-y-4 px-4 pb-6">
        <MemberFilterBar academicYears={academicYears} query={query} />
        <MemberTable memberships={memberships.data} hasFilters={hasFilters} />
        <Pagination
          className="p-4"
          page={page}
          pageSize={pageSize}
          total={memberships.total}
          totalPages={memberships.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          query={{ ...query, page }}
        />
      </section>
    </>
  );
}
