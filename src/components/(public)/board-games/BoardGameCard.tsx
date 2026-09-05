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
  const metadata = [boardGame.category?.name, boardGame.location?.name].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return (
    <Link
      href={`/board-games/${boardGame.id}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-(--border-default) bg-(--surface-default) text-left shadow-(--shadow-base) transition-[border-color,box-shadow] hover:border-(--border-strong) hover:shadow-(--shadow-card) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
    >
      <div className="relative aspect-square overflow-hidden border-b border-(--border-default) bg-(--surface-subtle)">
        <BoardGameImage
          boardGame={boardGame}
          className={
            boardGame.image
              ? "h-full w-full object-contain"
              : "h-full w-full object-contain p-8 opacity-60"
          }
          loading="lazy"
        />
        <BoardGameStatusBadge
          status={boardGame.status}
          className="absolute top-2 right-2 z-10 shadow-(--shadow-base)"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <h2
          title={boardGame.name}
          className="line-clamp-2 min-h-10 min-w-0 break-words text-sm leading-snug font-semibold text-(--text-primary) transition-colors group-hover:text-(--interactive-primary) sm:min-h-11 sm:text-base"
        >
          {boardGame.name}
        </h2>

        <div className="mt-2 flex min-w-0 items-start justify-between gap-2 text-xs leading-5 text-(--text-muted) sm:text-sm">
          {metadata.length > 0 ? (
            <span className="min-w-0 break-words">
              {metadata.join(" · ")}
            </span>
          ) : null}
          <span className="shrink-0 whitespace-nowrap">
            <span className="sr-only">社產編號 </span>#{boardGame.inventory_number}
          </span>
        </div>

        {description ? (
          <p className="mt-2 line-clamp-2 break-words text-xs leading-5 text-(--text-secondary) sm:text-sm sm:leading-6">
            {description}
          </p>
        ) : null}

        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-(--interactive-primary)">
          查看詳情
          <ArrowRight aria-hidden="true" className="size-4" />
        </span>
      </div>
    </Link>
  );
}
