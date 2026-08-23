import Link from "next/link";
import { BoardGameImage } from "@/components/BoardGameImage";
import { BoardGameStatusBadge } from "@/components/(public)/board-games/BoardGameStatusBadge";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";

type BoardGameCardProps = {
  boardGame: BoardGameWithCategoryAndLocation;
};

export function BoardGameCard({ boardGame }: BoardGameCardProps) {
  const description = boardGame.description?.trim();

  return (
    <Link
      href={`/board-games/${boardGame.id}`}
      className="card group grid grid-cols-[6.5rem_1fr] overflow-hidden rounded-xl p-0 text-left transition-transform duration-200 hover:-translate-y-0.5 sm:flex sm:h-full sm:flex-col"
    >
      <div className="overflow-hidden border-r border-(--border) bg-(--secondary-background) sm:border-r-0 sm:border-b">
        <BoardGameImage
          boardGame={boardGame}
          className="aspect-square h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] sm:aspect-5/4 sm:h-auto lg:aspect-4/3"
          loading="lazy"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-(--foreground)">
              {boardGame.name}
            </p>
            <p className="mt-0.5 text-xs font-medium text-(--muted)">
              社產編號 {boardGame.inventory_number}
            </p>
          </div>

          <BoardGameStatusBadge
            status={boardGame.status}
            compact
            className="shrink-0"
          />
        </div>

        <div className="grid gap-1 text-xs text-(--muted)">
          <p className="truncate">
            <span className="font-medium text-(--foreground)">分類</span>{" "}
            {boardGame.category.name}
          </p>
          <p className="truncate">
            <span className="font-medium text-(--foreground)">位置</span>{" "}
            {boardGame.location.name}
          </p>
        </div>

        {description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-(--muted) sm:text-sm">
            {description}
          </p>
        ) : (
          <p className="text-xs text-(--muted) sm:text-sm">
            尚未補充桌遊描述。
          </p>
        )}

        <span className="mt-auto text-sm font-semibold text-(--primary)">
          查看詳情
        </span>
      </div>
    </Link>
  );
}
