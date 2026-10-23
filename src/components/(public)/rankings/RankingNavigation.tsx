"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { BOARD_GAME_RANKINGS } from "@/app/(public)/rankings/ranking-config";
import type { BoardGameRanking } from "@/repositories/board-game-statistics.repository";
import { cn } from "@/utils/className";

function buildRankingHref(basePath: string, ranking: BoardGameRanking, search?: string, pageSize?: number) {
  const params = new URLSearchParams();
  if (ranking !== "popular") params.set("ranking", ranking);
  if (search) params.set("q", search);
  if (pageSize && pageSize !== 20) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function RankingNavigation({ active, basePath = "/rankings/board-games", search, pageSize }: {
  active: BoardGameRanking;
  basePath?: string;
  search?: string;
  pageSize?: number;
}) {
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // 路由切換後讓目前排行留在可視範圍內，不改變頁面的垂直捲動位置。
    activeLinkRef.current?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [active]);

  return (
    <nav aria-label="桌遊排行榜類型" className="min-w-0 max-w-full">
      <div className="max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max flex-nowrap border-b border-(--border-muted)">
          {BOARD_GAME_RANKINGS.map((ranking) => {
            const isActive = active === ranking.key;

            return (
              <li key={ranking.key} className="shrink-0">
                <Link
                  ref={isActive ? activeLinkRef : undefined}
                  href={buildRankingHref(basePath, ranking.key, search, pageSize)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap border-b-2 px-3 text-center text-sm font-medium transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) sm:px-4",
                    isActive
                      ? "border-(--interactive-primary) text-(--interactive-primary)"
                      : "border-transparent text-(--text-muted) hover:border-(--border-default) hover:text-(--text-primary)",
                  )}
                >
                  {ranking.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
