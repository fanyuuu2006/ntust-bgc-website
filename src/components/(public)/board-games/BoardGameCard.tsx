import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
      className="card interactive group grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] overflow-hidden rounded-2xl p-0 text-left sm:flex sm:h-full sm:flex-col"
    >
      <div className="overflow-hidden border-r border-(--border-default) bg-(--surface-subtle) sm:border-r-0 sm:border-b">
        <BoardGameImage
          boardGame={boardGame}
          className="aspect-square h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] sm:aspect-5/4 sm:h-auto lg:aspect-4/3"
          loading="lazy"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-2 text-base font-bold leading-snug text-(--text-primary)">
              {boardGame.name}
            </p>
            <p className="mt-0.5 text-xs font-medium text-(--text-muted)">
              社產編號 {boardGame.inventory_number}
            </p>
          </div>

          <BoardGameStatusBadge
            status={boardGame.status}
            className="shrink-0"
          />
        </div>

        <div className="grid gap-1 text-xs text-(--text-muted)">
          <p className="truncate">
            <span className="font-medium text-(--text-primary)">分類</span>{" "}
            {boardGame.category.name}
          </p>
          <p className="truncate">
            <span className="font-medium text-(--text-primary)">位置</span>{" "}
            {boardGame.location.name}
          </p>
        </div>

        {description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-(--text-muted) sm:text-sm">
            {description}
          </p>
        ) : (
          <p className="text-xs text-(--text-muted) sm:text-sm">
            尚未補充桌遊描述。
          </p>
        )}

        <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-(--interactive-primary)">
          查看詳情
          <ArrowRight aria-hidden="true" className="size-4" />
        </span>
      </div>
    </Link>
  );
}
