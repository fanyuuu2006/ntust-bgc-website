import { redirect } from "next/navigation";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { OfficerActions } from "@/components/(admin)/admin/officers/OfficerActions";
import { OfficerRecords } from "@/components/(admin)/admin/officers/OfficerRecords";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { membershipService } from "@/services/memberships/memberships.service";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { usersService } from "@/services/users/users.service";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default async function OfficersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    academicYearId?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.search === "" || params.academicYearId === "") {
    const normalized = new URLSearchParams();
    if (params.search?.trim()) normalized.set("search", params.search.trim());
    if (params.academicYearId) normalized.set("academicYearId", params.academicYearId);
    if (params.page) normalized.set("page", params.page);
    if (params.pageSize) normalized.set("pageSize", params.pageSize);
    redirect(normalized.size ? `/admin/officers?${normalized}` : "/admin/officers");
  }
  const page = Math.max(1, Number(params.page) || 1);
  const requestedPageSize = Number(params.pageSize);
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedPageSize
    : 20;
  const [years, officers, users] = await Promise.all([
    membershipService.listAcademicYears(),
    officerPositionsService.listForAdmin({
      page,
      pageSize,
      academicYearId: params.academicYearId,
      titleSearch: params.search?.trim() || undefined,
    }),
    usersService.listForAdmin({ page: 1, pageSize: 100 }),
  ]);
  const clearSearchParams = new URLSearchParams();
  if (params.academicYearId) clearSearchParams.set("academicYearId", params.academicYearId);
  if (params.pageSize) clearSearchParams.set("pageSize", params.pageSize);
  const clearSearchHref = clearSearchParams.size ? `/admin/officers?${clearSearchParams}` : "/admin/officers";

  return (
    <>
      <HeadingSection
        title="幹部管理"
        description="依學年度管理職位；曾任幹部的使用者保有管理權限。"
        actions={<OfficerActions users={users.data} years={years} />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <form>
          <AdminToolbar className="grid grid-cols-[minmax(0,1fr)_auto] items-center lg:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <ClearableSearchInput initialValue={params.search} clearHref={clearSearchHref} name="search" placeholder="搜尋職位" aria-label="搜尋幹部職位" className="min-w-0" />
            <Select name="academicYearId" defaultValue={params.academicYearId ?? ""} className="col-span-2 w-full lg:col-span-1">
              <option value="">全部學年度</option>
              {years.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度</option>)}
            </Select>
            <Button type="submit" className="shrink-0">搜尋</Button>
          </AdminToolbar>
        </form>
        <OfficerRecords officers={officers.data} years={years} users={users.data} />
        <Pagination page={page} pageSize={pageSize} total={officers.total} totalPages={officers.totalPages} basePath="/admin/officers" pageSizeOptions={PAGE_SIZE_OPTIONS} query={{ search: params.search, academicYearId: params.academicYearId }} />
      </section>
    </>
  );
}
