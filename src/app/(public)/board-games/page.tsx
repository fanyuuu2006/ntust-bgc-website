
import Link from "next/link";
import { Pagination } from "@/components/Pagination/Pagination";
import { BoardGameImage } from "@/components/BoardGameImage";
import { boardGamesService } from "@/services/board-games/board-games.service";
import type { BoardGameStatus } from "@/types/database";
import { buildQueryString } from "@/utils/url";

type BoardGamesSearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
  status?: string | string[];
  category?: string | string[];
  location?: string | string[];
  sort?: string;
  orderBy?: "name" | "created_at" | "updated_at" | "inventory_number";
  orderDirection?: "asc" | "desc";
};

type BoardGamesPageProps = {
  searchParams: Promise<BoardGamesSearchParams>;
};

const BASE_PATH = "/board-games";
const PAGE_SIZE_OPTIONS = [12, 24, 36] as const;
const STATUS_OPTIONS: { value?: BoardGameStatus; label: string }[] = [
  { label: "全部" },
  { value: "available", label: "可借用" },
  { value: "borrowed", label: "借用中" },
  { value: "maintenance", label: "維護中" },
];

const ALLOWED_STATUS: BoardGameStatus[] = [
  "available",
  "borrowed",
  "maintenance",
  "lost",
  "damaged",
  "retired",
];

const STATUS_META: Record<BoardGameStatus, { label: string; dotClass: string }> = {
  available: { label: "可借用", dotClass: "bg-(--game-green)" },
  borrowed: { label: "借用中", dotClass: "bg-(--game-blue)" },
  maintenance: { label: "維護中", dotClass: "bg-(--game-yellow)" },
  lost: { label: "遺失", dotClass: "bg-(--game-red)" },
  damaged: { label: "損壞", dotClass: "bg-(--game-red)" },
  retired: { label: "已除役", dotClass: "bg-(--muted)" },
};

const SORT_OPTIONS = [
  {
    key: "created_at:desc",
    label: "最新加入",
    orderBy: "created_at",
    orderDirection: "desc",
  },
  {
    key: "inventory_number:asc",
    label: "館藏編號",
    orderBy: "inventory_number",
    orderDirection: "asc",
  },
  {
    key: "name:asc",
    label: "名稱 A-Z",
    orderBy: "name",
    orderDirection: "asc",
  },
  {
    key: "updated_at:desc",
    label: "最近更新",
    orderBy: "updated_at",
    orderDirection: "desc",
  },
] as const;

function getSingle(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? undefined;
  return value;
}

function normalizeStatus(value?: string): BoardGameStatus | undefined {
  if (!value) return undefined;
  if (!ALLOWED_STATUS.includes(value as BoardGameStatus)) return undefined;
  return value as BoardGameStatus;
}

export default async function BoardGamesPage({ searchParams }: BoardGamesPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const pageSize = Math.max(
    1,
    Math.min(100, Number(params.pageSize ?? PAGE_SIZE_OPTIONS[0]) || PAGE_SIZE_OPTIONS[0]),
  );

  const search = getSingle(params.search)?.trim() || undefined;
  const selectedStatus = normalizeStatus(getSingle(params.status));
  const selectedCategory = getSingle(params.category);
  const selectedLocation = getSingle(params.location);

  const sortFromQuery = getSingle(params.sort);
  const selectedSort = SORT_OPTIONS.find((option) => option.key === sortFromQuery);
  const orderBy = selectedSort?.orderBy ?? params.orderBy ?? "created_at";
  const orderDirection = selectedSort?.orderDirection ?? params.orderDirection ?? "desc";

  const [categories, locations, games, total, availableCount, borrowedCount, maintenanceCount] =
    await Promise.all([
      boardGamesService.listCategories(),
      boardGamesService.listLocations(),
      boardGamesService.listBoardGamesWithCategoryAndLocation({
        page,
        pageSize,
        search,
        status: selectedStatus,
        category_ids: selectedCategory ? [selectedCategory] : undefined,
        location_ids: selectedLocation ? [selectedLocation] : undefined,
        orderBy,
        orderDirection,
      }),
      boardGamesService.countAllBoardGames(),
      boardGamesService.countBoardGamesByStatus("available"),
      boardGamesService.countBoardGamesByStatus("borrowed"),
      boardGamesService.countBoardGamesByStatus("maintenance"),
    ]);

  const quickCategoryOptions = categories.slice(0, 6);
  const selectedSortKey = `${orderBy}:${orderDirection}`;

  const query = {
    search,
    status: selectedStatus,
    category: selectedCategory,
    location: selectedLocation,
    orderBy,
    orderDirection,
  };

  const getFilterHref = (overrides: Partial<typeof query>) => {
    const baseQuery = { ...query, page: 1 };
    const queryString = buildQueryString(baseQuery, {
      ...overrides,
      page: 1,
    });
    return queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
  };

  return (
    <section className="py-8">
      <div className="container space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-(--foreground) sm:text-3xl">桌遊館藏</h1>
          <p className="text-sm text-(--muted) sm:text-base">
            探索社團目前收藏的桌遊，找到適合你的下一款遊戲。
          </p>
        </header>

        <section className="card space-y-4 rounded-2xl p-4 sm:p-5">
          <form method="GET" action={BASE_PATH} className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="board-game-search" className="sr-only">
              搜尋桌遊名稱或館藏編號
            </label>
            <input
              id="board-game-search"
              type="search"
              name="search"
              defaultValue={search}
              placeholder="搜尋桌遊名稱、館藏編號..."
              className="w-full rounded-xl border border-(--border) bg-(--secondary-background) px-4 py-2.5 text-sm text-(--foreground) outline-none transition focus:border-(--primary)"
            />
            <input type="hidden" name="status" value={selectedStatus ?? ""} />
            <input type="hidden" name="category" value={selectedCategory ?? ""} />
            <input type="hidden" name="location" value={selectedLocation ?? ""} />
            <input type="hidden" name="orderBy" value={orderBy} />
            <input type="hidden" name="orderDirection" value={orderDirection} />
            <input type="hidden" name="pageSize" value={pageSize} />
            <button
              type="submit"
              className="btn primary inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              搜尋
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => {
              const isActive = (option.value ?? "") === (selectedStatus ?? "");
              return (
                <Link
                  key={option.label}
                  href={getFilterHref({ status: option.value })}
                  className={`btn rounded-full px-3 py-1.5 text-sm ${isActive ? "border-(--primary) text-(--primary)" : ""}`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={getFilterHref({ category: undefined })}
              className={`btn rounded-full px-3 py-1.5 text-sm ${!selectedCategory ? "border-(--primary) text-(--primary)" : ""}`}
            >
              全部分類
            </Link>
            {quickCategoryOptions.map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <Link
                  key={category.id}
                  href={getFilterHref({ category: category.id })}
                  className={`btn rounded-full px-3 py-1.5 text-sm ${isActive ? "border-(--primary) text-(--primary)" : ""}`}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <details className="group relative">
              <summary className="btn inline-flex list-none items-center rounded-xl px-3 py-2 text-sm marker:content-none">
                更多篩選
              </summary>
              <div className="card mt-2 w-full min-w-72 space-y-3 rounded-xl p-3 sm:absolute sm:left-0 sm:z-20 sm:w-80">
                <form method="GET" action={BASE_PATH} className="space-y-3">
                  <input type="hidden" name="search" value={search ?? ""} />
                  <input type="hidden" name="orderBy" value={orderBy} />
                  <input type="hidden" name="orderDirection" value={orderDirection} />
                  <input type="hidden" name="pageSize" value={pageSize} />

                  <label className="flex flex-col gap-1 text-sm text-(--muted)">
                    狀態
                    <select
                      name="status"
                      defaultValue={selectedStatus ?? ""}
                      className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-(--foreground) outline-none focus:border-(--primary)"
                    >
                      <option value="">全部</option>
                      <option value="available">可借用</option>
                      <option value="borrowed">借用中</option>
                      <option value="maintenance">維護中</option>
                      <option value="lost">遺失</option>
                      <option value="damaged">損壞</option>
                      <option value="retired">已除役</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-(--muted)">
                    分類
                    <select
                      name="category"
                      defaultValue={selectedCategory ?? ""}
                      className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-(--foreground) outline-none focus:border-(--primary)"
                    >
                      <option value="">全部</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-(--muted)">
                    位置
                    <select
                      name="location"
                      defaultValue={selectedLocation ?? ""}
                      className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-(--foreground) outline-none focus:border-(--primary)"
                    >
                      <option value="">全部</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Link href={BASE_PATH} className="btn rounded-lg px-3 py-2 text-sm">
                      清除
                    </Link>
                    <button type="submit" className="btn primary rounded-lg px-3 py-2 text-sm">
                      套用
                    </button>
                  </div>
                </form>
              </div>
            </details>

            <form method="GET" action={BASE_PATH} className="flex items-center gap-2">
              <input type="hidden" name="search" value={search ?? ""} />
              <input type="hidden" name="status" value={selectedStatus ?? ""} />
              <input type="hidden" name="category" value={selectedCategory ?? ""} />
              <input type="hidden" name="location" value={selectedLocation ?? ""} />
              <input type="hidden" name="pageSize" value={pageSize} />
              <label className="text-sm text-(--muted)" htmlFor="board-game-sort">
                排序
              </label>
              <select
                id="board-game-sort"
                name="sort"
                defaultValue={selectedSortKey}
                className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm text-(--foreground) outline-none focus:border-(--primary)"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn rounded-lg px-3 py-2 text-sm">
                套用
              </button>
            </form>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-(--muted)">
            <span className="font-medium text-(--foreground)">共 {games.total} 款桌遊</span>
            <span>館藏總數 {total}</span>
            <span>可借用 {availableCount}</span>
            <span>借用中 {borrowedCount}</span>
            <span>維護中 {maintenanceCount}</span>
          </div>
        </section>

        {games.data.length === 0 ? (
          <div className="card rounded-2xl p-8 text-center">
            <p className="text-base font-medium text-(--foreground)">找不到符合條件的桌遊</p>
            <p className="mt-2 text-sm text-(--muted)">試試看調整關鍵字、分類或狀態條件。</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {games.data.map((boardGame) => {
              const status = STATUS_META[boardGame.status];

              return (
                <Link
                  key={boardGame.id}
                  href={`/board-games/${boardGame.id}`}
                  className="card group flex h-full flex-col overflow-hidden rounded-2xl p-0 text-left transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div className="overflow-hidden border-b border-(--border) bg-(--secondary-background)">
                    <BoardGameImage
                      boardGame={boardGame}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-(--foreground)">
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} aria-hidden />
                      {status.label}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-(--foreground)">{boardGame.name}</p>
                      <p className="mt-1 text-sm text-(--muted)">
                        {boardGame.category.name} · {boardGame.location.name}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-(--muted)">
                        館藏編號 #{String(boardGame.inventory_number).padStart(3, "0")}
                      </p>
                    </div>

                    {boardGame.description && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-(--muted)">
                        {boardGame.description}
                      </p>
                    )}

                    <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-(--primary)">
                      查看桌遊詳情
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={games.total}
          totalPages={games.totalPages}
          basePath={BASE_PATH}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          query={query}
        />
      </div>
    </section>
  );
}
