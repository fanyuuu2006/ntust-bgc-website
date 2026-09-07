import { z } from "zod";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { OfficerActions } from "@/components/(admin)/admin/officers/OfficerActions";
import { OfficerRecords } from "@/components/(admin)/admin/officers/OfficerRecords";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { membershipService } from "@/services/memberships/memberships.service";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
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
  const [years, officers] = await Promise.all([
    membershipService.listAcademicYears(),
    officerPositionsService.listForAdmin({
      page,
      pageSize,
      academicYearId: params.academicYearId,
      titleSearch: params.search?.trim() || undefined,
    }),
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
        actions={<OfficerActions years={years} />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <AdminToolbar className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1fr)_12rem] md:items-center">
          <form className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" aria-label="搜尋幹部職位">
            <PreservedQueryFields query={{ search: params.search, academicYearId: params.academicYearId, pageSize }} ownedKeys={["search"]} />
            <ClearableSearchInput initialValue={params.search} clearHref={clearSearchHref} name="search" placeholder="搜尋職位" aria-label="搜尋幹部職位" className="w-full" />
            <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
          </form>
            <ImmediateQuerySelect appliedQuery={{ search: params.search, academicYearId: params.academicYearId, pageSize }} basePath="/admin/officers" queryKey="academicYearId" value={params.academicYearId ?? ""} aria-label="學年度" className="w-full">
              <option value="">全部學年度</option>
              {years.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度</option>)}
            </ImmediateQuerySelect>
        </AdminToolbar>
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
