import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { MembershipCreateButton } from "@/components/(admin)/admin/memberships/MembershipCreateButton";
import { MembershipRecords } from "@/components/(admin)/admin/memberships/MembershipRecords";
import { MemberFilterBar } from "@/components/(admin)/admin/memberships/MembershipFilterBar";
import { Pagination } from "@/components/Pagination/Pagination";
import { ButtonLink } from "@/components/ui/Button";
import { listAdminMembershipsQuerySchema } from "@/services/memberships/memberships.schema";
import { membershipService } from "@/services/memberships/memberships.service";
import { usersService } from "@/services/users/users.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MembershipsPage({ searchParams }: Props) {
  const parsed = listAdminMembershipsQuerySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : {};
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const [years, memberships, users] = await Promise.all([
    membershipService.listAcademicYears(),
    membershipService.listAdminMemberships({ ...query, page, pageSize }),
    usersService.listForAdmin({ page: 1, pageSize: 100 }),
  ]);
  return (
    <>
      <HeadingSection
        title="社員資格管理"
        description="管理使用者的社員資格。"
        actions={
          <>
            <ButtonLink href="/admin/memberships/register-keys" variant="outline">
              社員註冊碼
            </ButtonLink>
            <MembershipCreateButton
              users={users.data}
              years={years}
            />
          </>
        }
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <MemberFilterBar
          academicYears={years}
          query={query}
        />
        <MembershipRecords
          memberships={memberships.data}
          years={years}
          query={query}
        />
        <Pagination
          className="p-4"
          page={page}
          pageSize={pageSize}
          total={memberships.total}
          totalPages={memberships.totalPages}
          basePath="/admin/memberships"
          pageSizeOptions={[10, 20, 50, 100]}
          query={{ ...query, page }}
        />
      </section>
    </>
  );
}
