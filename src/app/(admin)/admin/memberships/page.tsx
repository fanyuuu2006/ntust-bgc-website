import Link from "next/link";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { MembershipManager } from "@/components/(admin)/admin/memberships/MembershipManager";
import { MemberFilterBar } from "@/components/(admin)/admin/members/MemberFilterBar";
import { Pagination } from "@/components/Pagination/Pagination";
import { listAdminMembershipsQuerySchema } from "@/services/memberships/memberships.schema";
import { membershipService } from "@/services/memberships/memberships.service";
import { usersService } from "@/services/users/users.service";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function MembershipsPage({ searchParams }: Props) { const parsed = listAdminMembershipsQuerySchema.safeParse(await searchParams); const query = parsed.success ? parsed.data : {}; const page = query.page ?? 1; const pageSize = query.pageSize ?? 20; const [years, memberships, users] = await Promise.all([membershipService.listAcademicYears(), membershipService.listAdminMemberships({ ...query, page, pageSize }), usersService.listForAdmin({ page: 1, pageSize: 100 })]); return <><HeadingSection title="社員資格管理" description="依學年度建立、篩選與管理使用者的社員資格。" actions={<Link href="/admin/memberships/register-keys" className="btn outline rounded-lg px-4 py-2 text-sm">社員註冊碼</Link>} /><section className="space-y-4 px-4 pb-6"><MemberFilterBar academicYears={years} query={query} /><MembershipManager memberships={memberships.data} users={users.data} years={years} /><Pagination className="p-4" page={page} pageSize={pageSize} total={memberships.total} totalPages={memberships.totalPages} basePath="/admin/memberships" pageSizeOptions={[10, 20, 50, 100]} query={{ ...query, page }} /></section></>; }
