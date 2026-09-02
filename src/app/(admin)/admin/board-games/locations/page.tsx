import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { LocationCreateAction } from "@/components/(admin)/admin/board-games/locations/LocationCreateAction";
import { LocationRecords } from "@/components/(admin)/admin/board-games/locations/LocationRecords";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { Pagination } from "@/components/Pagination/Pagination";
import { Button } from "@/components/ui/Button";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function BoardGameLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = [10, 20, 50, 100].includes(Number(params.pageSize))
    ? Number(params.pageSize)
    : 20;
  const locations = await boardGamesService.listLocationsForAdmin({
    search: params.search?.trim() || undefined,
    page,
    pageSize,
  });
  const usageCounts = await boardGamesService.countBoardGamesByLocationIds(
    locations.data.map((location) => location.id),
  );
  const items = locations.data.map((location) => ({
    ...location,
    count: usageCounts[location.id] ?? 0,
  }));
  const clearSearchHref = params.pageSize
    ? "/admin/board-games/locations?pageSize=" + params.pageSize
    : "/admin/board-games/locations";

  return (
    <>
      <HeadingSection
        title="桌遊位置管理"
        description="維護社產存放位置；仍有社產使用的位置不可刪除。"
        actions={<LocationCreateAction />}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <form>
          <AdminToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ClearableSearchInput
              initialValue={params.search}
              clearHref={clearSearchHref}
              name="search"
              placeholder="搜尋桌遊位置"
              className="w-full sm:flex-1"
            />
            <Button type="submit" variant="primary" className="w-full sm:w-auto">搜尋</Button>
          </AdminToolbar>
        </form>
        <LocationRecords items={items} />
        <Pagination
          page={page}
          pageSize={pageSize}
          total={locations.total}
          totalPages={locations.totalPages}
          basePath="/admin/board-games/locations"
          pageSizeOptions={[10, 20, 50, 100]}
          query={{ search: params.search }}
        />
      </section>
    </>
  );
}
