import { withServerErrorReference } from "@/libs/observability/server-render";
import { AcademicYearActions } from "@/components/(admin)/admin/academic-years/AcademicYearActions";
import { AcademicYearRecords } from "@/components/(admin)/admin/academic-years/AcademicYearRecords";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { academicYearsService } from "@/services/academic-years/academic-years.service";
import {
  normalizePageSizeOption,
  readSingleQueryValue,
  type QueryParamValue,
} from "@/libs/query-params";
import { parsePage } from "@/utils/pagination";

async function AcademicYearsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: QueryParamValue; page?: QueryParamValue; pageSize?: QueryParamValue }>;
}) {
  const rawParams = await searchParams;
  const search = readSingleQueryValue(rawParams.search);
  const pageParam = readSingleQueryValue(rawParams.page);
  const pageSizeParam = readSingleQueryValue(rawParams.pageSize);
  const page = parsePage(pageParam);
  const pageSize = normalizePageSizeOption(pageSizeParam, [10, 20, 50, 100], 20);
  const years = await academicYearsService.listForAdmin({
    search: search?.trim() || undefined,
    page,
    pageSize,
  });
  const clearSearchHref = pageSizeParam
    ? "/admin/academic-years?pageSize=" + pageSizeParam
    : "/admin/academic-years";

  return (
    <>
      <HeadingSection
        title="學年度管理"
        description="建立、編輯與設定目前學年度。"
        actions={<AcademicYearActions />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <form>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={pageSize} />
          <AdminToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ClearableSearchInput
              initialValue={search}
              clearHref={clearSearchHref}
              name="search"
              placeholder="搜尋學年度"
              className="w-full sm:flex-1"
            />
            <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
          </AdminToolbar>
        </form>
        <AcademicYearRecords years={years.data} hasQuery={Boolean(search || page > 1)} />
        <Pagination
          className="p-4"
          page={page}
          pageSize={pageSize}
          total={years.total}
          totalPages={years.totalPages}
          basePath="/admin/academic-years"
          pageSizeOptions={[10, 20, 50, 100]}
          query={{ search }}
        />
      </section>
    </>
  );
}

export default withServerErrorReference(AcademicYearsPage, "/admin/academic-years");
