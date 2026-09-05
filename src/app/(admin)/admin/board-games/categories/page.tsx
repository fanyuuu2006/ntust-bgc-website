import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { CategoryCreateAction } from "@/components/(admin)/admin/board-games/categories/CategoryCreateAction";
import { CategoryRecords } from "@/components/(admin)/admin/board-games/categories/CategoryRecords";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function BoardGameCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.pageSize))
    ? Number(params.pageSize)
    : 20;
  const categories = await boardGamesService.listCategoriesForAdmin({
    search: params.search?.trim() || undefined,
    page,
    pageSize,
  });
  const usageCounts = await boardGamesService.countBoardGamesByCategoryIds(
    categories.data.map((category) => category.id),
  );
  const items = categories.data.map((category) => ({
    ...category,
    count: usageCounts[category.id] ?? 0,
  }));
  const clearSearchHref = params.pageSize
    ? "/admin/board-games/categories?pageSize=" + params.pageSize
    : "/admin/board-games/categories";

  return (
    <>
      <HeadingSection
        title="桌遊分類管理"
        description="維護桌遊分類；仍有桌遊使用的分類不可刪除。"
        actions={<CategoryCreateAction />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <form>
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={pageSize} />
          <AdminToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ClearableSearchInput
              initialValue={params.search}
              clearHref={clearSearchHref}
              name="search"
              placeholder="搜尋桌遊分類"
              className="w-full sm:flex-1"
            />
            <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
          </AdminToolbar>
        </form>
        <CategoryRecords items={items} hasQuery={Boolean(params.search || page > 1)} />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={categories.total}
          totalPages={categories.totalPages}
          basePath="/admin/board-games/categories"
          pageSizeOptions={[10, 20, 50, 100]}
          query={{ search: params.search }}
        />
      </section>
    </>
  );
}
