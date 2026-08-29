import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
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
  const items = await Promise.all(
    categories.data.map(async (category) => ({
      ...category,
      count: await boardGamesService.countBoardGamesByCategoryId(category.id),
    })),
  );
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
          <AdminToolbar className="grid grid-cols-[minmax(0,1fr)_auto] items-center">
            <ClearableSearchInput
              initialValue={params.search}
              clearHref={clearSearchHref}
              name="search"
              placeholder="搜尋桌遊分類"
              className="min-w-0"
            />
            <Button type="submit" className="shrink-0">
              搜尋
            </Button>
          </AdminToolbar>
        </form>
        <CategoryRecords items={items} />
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
