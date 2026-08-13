
import Link from "next/link";
import { BoardGameImage } from "@/components/BoardGameImage";
import { BoardGameStatusBadge } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function BoardGamesPage() {
  const games = await boardGamesService.listBoardGamesWithCategoryAndLocation({
    page: 1,
    pageSize: 24,
    status: "available",
    orderBy: "inventory_number",
    orderDirection: "asc",
  });

  return (
    <section className="py-8">
      <div className="container">
        <header className="mb-6 space-y-2">
          <p className="text-sm font-medium text-(--primary)">桌遊借用</p>
          <h1 className="text-2xl font-bold text-(--foreground) sm:text-3xl">
            可借用桌遊
          </h1>
        </header>

        {games.data.length === 0 ? (
          <div className="card rounded-2xl p-8 text-center">
            <p className="text-base font-medium text-(--foreground)">
              目前沒有可借用桌遊
            </p>
            <p className="mt-2 text-sm text-(--muted)">
              請稍後再看看，或留意社團公告。
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {games.data.map((boardGame) => (
              <Link
                key={boardGame.id}
                href={`/board-games/${boardGame.id}`}
                className="card group flex h-full flex-col overflow-hidden rounded-2xl p-0 text-left transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="relative">
                  <BoardGameImage
                    boardGame={boardGame}
                    className="h-48 w-full object-cover sm:h-56"
                  />
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-(--foreground)">
                        {boardGame.name}
                      </p>
                      <p className="mt-1 text-sm text-(--muted)">
                        館藏編號：{boardGame.inventory_number}
                      </p>
                    </div>
                    <BoardGameStatusBadge status={boardGame.status} />
                  </div>

                  <p className="line-clamp-3 text-sm leading-relaxed text-(--muted)">
                    {boardGame.description || "暫無詳細說明，歡迎到現場查看桌遊內容。"}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-(--border) pt-3 text-sm text-(--muted)">
                    <span>{boardGame.category.name}</span>
                    <span>{boardGame.location.name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
