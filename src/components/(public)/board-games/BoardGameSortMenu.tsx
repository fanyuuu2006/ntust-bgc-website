"use client";

import { useState } from "react";
import Link from "next/link";
import { BASE_PATH, SORT_OPTIONS } from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { buildQueryString } from "@/utils/url";
import { cn } from "@/utils/className";
import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";
import { Button } from "@/components/ui/Button";

type BoardGameSortMenuProps = {
  query: BoardGamesQuery;
};

export function BoardGameSortMenu({ query }: BoardGameSortMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideDismiss<HTMLDivElement>(open, () => setOpen(false));

  const activeOption =
    SORT_OPTIONS.find(
      (option) =>
        option.orderBy === query.orderBy &&
        option.orderDirection === query.orderDirection,
    ) ?? SORT_OPTIONS[0];

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        type="button"
        aria-label="選擇桌遊排序方式"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        variant="secondary"
        className="min-h-9 shrink-0 rounded-full px-3"
      >
        排序：{activeOption.label}
      </Button>

      {open && (
        <div className="card absolute top-[calc(100%+0.5rem)] right-0 z-10 w-max min-w-36 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md py-1">
          {SORT_OPTIONS.map((option) => {
            const isActive = option.key === activeOption.key;
            const href = `${BASE_PATH}?${buildQueryString(
              { ...query, page: 1 },
              {
                orderBy: option.orderBy,
                orderDirection: option.orderDirection,
              },
            )}`;

            return (
              <Link
                key={option.key}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block min-h-9 px-3 py-2 text-sm whitespace-nowrap text-(--text-primary) hover:bg-(--surface-subtle)",
                  { "font-medium text-(--interactive-primary)": isActive },
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
