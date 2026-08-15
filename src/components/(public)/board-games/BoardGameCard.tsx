import Link from "next/link";
import { BoardGameImage } from "@/components/BoardGameImage";
import { STATUS_META } from "@/app/(public)/board-games/constants";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";

type BoardGameCardProps = {
  boardGame: BoardGameWithCategoryAndLocation;
};

export function BoardGameCard({ boardGame }: BoardGameCardProps) {
  const status = STATUS_META[boardGame.status];

  return (
    <Link
      href={`/board-games/${boardGame.id}`}
      className="card group flex h-full flex-col overflow-hidden rounded-2xl p-0 text-left transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="overflow-hidden border-b border-(--border) bg-(--secondary-background)">
        <BoardGameImage
          boardGame={boardGame}
          className="aspect-4/3 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-(--foreground)">
          <span
            className={`size-1.5 shrink-0 rounded-full ${status.dotClass}`}
            aria-hidden
          />
          {status.label}
        </div>

        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-(--foreground)">
            {boardGame.name}
          </p>
          <p className="mt-1 truncate text-sm text-(--muted)">
            {boardGame.category.name} ・ {boardGame.location.name}
          </p>
          <p className="mt-0.5 text-xs font-medium text-(--muted)">
            社產編號 {boardGame.inventory_number}
          </p>
        </div>

        {boardGame.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-(--muted)">
            {boardGame.description}
          </p>
        )}

        <span className="mt-auto text-sm font-medium text-(--primary)">
          查看桌遊詳情
        </span>
      </div>
    </Link>
  );
}
