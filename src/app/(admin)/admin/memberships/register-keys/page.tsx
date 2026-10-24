import { withServerErrorReference } from "@/libs/observability/server-render";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminBreadcrumbs } from "@/components/(admin)/admin/AdminBreadcrumbs";
import { RegisterKeyFilterBar } from "@/components/(admin)/admin/memberships/RegisterKeyFilterBar";
import { RegisterKeyGenerateForm } from "@/components/(admin)/admin/memberships/RegisterKeyGenerateForm";
import { RegisterKeyTable } from "@/components/(admin)/admin/memberships/RegisterKeyTable";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { listMembershipRegisterKeysQuerySchema } from "@/services/memberships/memberships.schema";
import { membershipService } from "@/services/memberships/memberships.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function MembershipRegisterKeysPage({ searchParams }: Props) {
  const parsed = listMembershipRegisterKeysQuerySchema.safeParse(
    await searchParams,
  );
  const query = parsed.success ? parsed.data : {};
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const [academicYears, registerKeys] = await Promise.all([
    membershipService.listAcademicYears(),
    membershipService.listRegisterKeys({ ...query, page, pageSize }),
  ]);

  return (
    <>
      <HeadingSection
        collection
        breadcrumb={<AdminBreadcrumbs items={[{ href: "/admin", label: "管理總覽" }, { href: "/admin/memberships", label: "社員資格管理" }, { label: "社員註冊序號管理" }]} />}
        title="社員註冊序號管理"
        description="產生序號，供已完成入社流程的使用者建立社員資格。"
        actions={
          <>
            <div className="flex items-center">
              <RegisterKeyGenerateForm
                academicYears={academicYears}
                defaultAcademicYearId={
                  academicYears.find((year) => year.is_current)?.id
                }
              />
            </div>
          </>
        }
      />
      <section className="space-y-3 px-4 pb-6 sm:px-6 lg:px-8">
        <RegisterKeyFilterBar academicYears={academicYears} query={query} />
        <PaginatedCollection className="space-y-3" page={page} pageSize={pageSize} total={registerKeys.total} totalPages={registerKeys.totalPages} basePath="/admin/memberships/register-keys" pageSizeOptions={[10, 20, 50, 100]} query={{ ...query, page }} paginationClassName="p-4">
        <RegisterKeyTable
          key={JSON.stringify({ ...query, page, pageSize })}
          registerKeys={registerKeys.data}
          hasFilters={Boolean(
            query.search || query.academic_year_id || query.status || page > 1,
          )}
        />
        </PaginatedCollection>
      </section>
    </>
  );
}

export default withServerErrorReference(MembershipRegisterKeysPage, "/admin/memberships/register-keys");
