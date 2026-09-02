import { AcademicYearActions } from "@/components/(admin)/admin/academic-years/AcademicYearActions";
import { AcademicYearRecords } from "@/components/(admin)/admin/academic-years/AcademicYearRecords";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { academicYearsService } from "@/services/academic-years/academic-years.service";

export default async function AcademicYearsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string }>;
}) {
  const { search, page: pageParam, pageSize: pageSizeParam } =
    await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(pageSizeParam))
    ? Number(pageSizeParam)
    : 20;
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
        <AcademicYearRecords years={years.data} />
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
