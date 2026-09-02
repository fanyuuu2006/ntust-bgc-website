import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { RegisterKeyFilterBar } from "@/components/(admin)/admin/memberships/RegisterKeyFilterBar";
import { RegisterKeyGenerateForm } from "@/components/(admin)/admin/memberships/RegisterKeyGenerateForm";
import { RegisterKeyTable } from "@/components/(admin)/admin/memberships/RegisterKeyTable";
import { Pagination } from "@/components/Pagination/Pagination";
import { ButtonLink } from "@/components/ui/Button";
import { listMembershipRegisterKeysQuerySchema } from "@/services/memberships/memberships.schema";
import { membershipService } from "@/services/memberships/memberships.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MembershipRegisterKeysPage({ searchParams }: Props) {
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
        title="社員註冊序號管理"
        description="產生序號，供已完成入社流程的使用者建立社員資格。"
        actions={
          <>
            <ButtonLink href="/admin/memberships" variant="outline">
              返回社員資格管理
            </ButtonLink>
            <RegisterKeyGenerateForm
              academicYears={academicYears}
              defaultAcademicYearId={academicYears.find((year) => year.is_current)?.id}
            />
          </>
        }
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <RegisterKeyFilterBar academicYears={academicYears} query={query} />
        <RegisterKeyTable
          registerKeys={registerKeys.data}
          hasFilters={Boolean(
            query.search || query.academic_year_id || query.status,
          )}
        />
        <Pagination
          className="p-4"
          page={page}
          pageSize={pageSize}
          total={registerKeys.total}
          totalPages={registerKeys.totalPages}
          basePath="/admin/memberships/register-keys"
          pageSizeOptions={[10, 20, 50, 100]}
          query={{ ...query, page }}
        />
      </section>
    </>
  );
}
