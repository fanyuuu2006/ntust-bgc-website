import { z } from "zod";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { OfficerActions } from "@/components/(admin)/admin/officers/OfficerActions";
import { OfficerRecords } from "@/components/(admin)/admin/officers/OfficerRecords";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { membershipService } from "@/services/memberships/memberships.service";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { usersService } from "@/services/users/users.service";
import {
  normalizePageSizeOption,
  readSingleQueryValue,
  type QueryParamValue,
} from "@/libs/query-params";
import { parsePage } from "@/utils/pagination";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default async function OfficersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: QueryParamValue;
    academicYearId?: QueryParamValue;
    page?: QueryParamValue;
    pageSize?: QueryParamValue;
  }>;
}) {
  const rawParams = await searchParams;
  const academicYearCandidate = readSingleQueryValue(rawParams.academicYearId);
  const params = {
    search: readSingleQueryValue(rawParams.search),
    academicYearId: z.uuid().safeParse(academicYearCandidate).success
      ? academicYearCandidate
      : undefined,
    page: readSingleQueryValue(rawParams.page),
    pageSize: readSingleQueryValue(rawParams.pageSize),
  };
  const page = parsePage(params.page);
  const pageSize = normalizePageSizeOption(params.pageSize, PAGE_SIZE_OPTIONS, 20);
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
        description="管理各學年度的幹部紀錄。"
        actions={<OfficerActions users={users.data} years={years} />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <form>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={pageSize} />
          <AdminToolbar className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-center">
            <ClearableSearchInput initialValue={params.search} clearHref={clearSearchHref} name="search" placeholder="搜尋職位" aria-label="搜尋幹部職位" className="w-full" />
            <Button type="submit" variant="primary" className="order-2 w-full md:order-3 md:w-auto">搜尋</Button>
            <Select name="academicYearId" defaultValue={params.academicYearId ?? ""} aria-label="學年度" className="order-3 w-full md:order-2">
              <option value="">全部學年度</option>
              {years.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度</option>)}
            </Select>
          </AdminToolbar>
        </form>
        <OfficerRecords
          officers={officers.data}
          years={years}
          hasQuery={Boolean(params.search || params.academicYearId || page > 1)}
        />
        <Pagination page={page} pageSize={pageSize} total={officers.total} totalPages={officers.totalPages} basePath="/admin/officers" pageSizeOptions={PAGE_SIZE_OPTIONS} query={{ search: params.search, academicYearId: params.academicYearId }} />
      </section>
    </>
  );
}
