import Link from "next/link";

import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { RegisterKeyGenerateForm } from "@/components/(admin)/admin/members/RegisterKeyGenerateForm";
import { RegisterKeyTable } from "@/components/(admin)/admin/members/RegisterKeyTable";
import { RegisterKeyFilterBar } from "@/components/(admin)/admin/members/register-keys/RegisterKeyFilterBar";
import { Pagination } from "@/components/Pagination/Pagination";
import { listMembershipRegisterKeysQuerySchema } from "@/services/memberships/memberships.schema";
import { membershipService } from "@/services/memberships/memberships.service";

const BASE_PATH = "/admin/members/register-keys";
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type RegisterKeysPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterKeysPage({
  searchParams,
}: RegisterKeysPageProps) {
  const rawQuery = await searchParams;
  const parsedQuery = listMembershipRegisterKeysQuerySchema.safeParse(rawQuery);
  const query = parsedQuery.success ? parsedQuery.data : {};
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const hasFilters = Boolean(
    query.search || query.academic_year_id || query.status,
  );
  const [academicYears, registerKeys] = await Promise.all([
    membershipService.listAcademicYears(),
    membershipService.listRegisterKeys({ ...query, page, pageSize }),
  ]);
  const currentAcademicYear = academicYears.find((year) => year.is_current);

  return (
    <>
      <HeadingSection
        title="社員註冊序號"
        description="產生、查找並追蹤線下繳費後發放的社員資格啟用憑證。"
        actions={
          <Link
            href="/admin/members"
            className="btn outline inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            返回社員管理
          </Link>
        }
      />

      <section className="space-y-4 px-4 pb-6">
        <RegisterKeyGenerateForm
          academicYears={academicYears}
          defaultAcademicYearId={currentAcademicYear?.id}
        />
        <RegisterKeyFilterBar academicYears={academicYears} query={query} />
        <RegisterKeyTable
          registerKeys={registerKeys.data}
          hasFilters={hasFilters}
        />
        <Pagination
          className="p-4"
          page={page}
          pageSize={pageSize}
          total={registerKeys.total}
          totalPages={registerKeys.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          query={{ ...query, page }}
        />
      </section>
    </>
  );
}
