import Link from "next/link";

import { BoardGameImage } from "@/components/BoardGameImage";
import { BoardGamePopularity } from "@/components/(public)/board-games/BoardGamePopularity";
import { BoardGameStatusBadge } from "@/components/(public)/board-games/BoardGameStatusBadge";
import type { BoardGameDiscoveryItem } from "@/services/board-games/board-games.types";

type HomeBoardGamePreviewProps = {
  boardGame: BoardGameDiscoveryItem;
};

export function HomeBoardGamePreview({
  boardGame,
}: HomeBoardGamePreviewProps) {
  const metadata = [boardGame.category?.name, boardGame.location?.name].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return (
    <Link
      href={`/board-games/${boardGame.id}`}
      aria-label={`查看桌遊：${boardGame.name}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-(--border-default) bg-(--surface-default) shadow-(--shadow-base) transition-[border-color,box-shadow] hover:border-(--border-strong) hover:shadow-(--shadow-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
    >
      <div className="relative aspect-3/2 overflow-hidden border-b border-(--border-default) bg-(--surface-subtle)">
        <BoardGameImage
          boardGame={boardGame}
          className={
            boardGame.image
              ? "h-full w-full object-contain"
              : "h-full w-full object-contain p-6 opacity-55 sm:p-8"
          }
          loading="lazy"
        />
        <BoardGameStatusBadge
          status={boardGame.status}
          className="absolute top-2 right-2 shadow-(--shadow-base)"
        />
      </div>

      <div className="min-w-0 p-3">
        <h3 className="line-clamp-2 min-h-10 break-words text-sm leading-snug font-semibold text-(--text-primary) transition-colors group-hover:text-(--interactive-primary) sm:min-h-11 sm:text-base">
          {boardGame.name}
        </h3>
        {metadata.length > 0 ? (
          <p className="mt-2 break-words text-xs leading-5 text-(--text-muted) sm:text-sm">
            {metadata.join(" · ")}
          </p>
        ) : null}
        <BoardGamePopularity stats={boardGame.stats} className="mt-1.5" />
      </div>
    </Link>
  );
}
