"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";
import { BASE_PATH, STATUS_META } from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { BoardGameSortMenu } from "@/components/(public)/board-games/BoardGameSortMenu";
import { buildQueryString } from "@/utils/url";
import { cn } from "@/utils/className";

const STATUS_OPTIONS = (Object.keys(STATUS_META) as BoardGameStatus[]).map(
  (value) => ({ value, label: STATUS_META[value].label }),
);

type FilterKey = "status" | "category" | "location";

type BoardGameFilterPanelProps = {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
};

export function BoardGameFilterPanel({
  categories,
  locations,
  query,
}: BoardGameFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const filterCount =
    (query.status?.length ?? 0) +
    (query.category?.length ?? 0) +
    (query.location?.length ?? 0);

  const toggleFilter = useCallback(
    (key: FilterKey, value: string, checked: boolean) => {
      const current = query[key] ?? [];
      const next = checked
        ? [...current, value]
        : current.filter((item) => item !== value);

      const queryString = buildQueryString(
        { ...query, page: undefined },
        {
          [key]: next,
        },
      );

      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [query, pathname, router],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "btn flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm",
              { "border-(--primary)": filterCount > 0 },
            )}
          >
            進階篩選
            {filterCount > 0 && (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-(--primary) text-[10px] font-medium text-(--primary-background)">
                {filterCount}
              </span>
            )}
          </button>

          {filterCount > 0 && (
            <Link
              href={BASE_PATH}
              className="btn shrink-0 rounded-full px-3 py-1 text-sm"
            >
              重設
            </Link>
          )}
        </div>

        <BoardGameSortMenu query={query} />
      </div>

      {open && (
        <div className="grid gap-4 border-t border-(--border) pt-3 sm:grid-cols-3">
          <FilterSection label="狀態">
            {STATUS_OPTIONS.map((option) => (
              <FilterPill
                key={option.value}
                label={option.label}
                checked={query.status?.includes(option.value) ?? false}
                onChange={(checked) =>
                  toggleFilter("status", option.value, checked)
                }
              />
            ))}
          </FilterSection>

          <FilterSection label="分類">
            {categories.map((category) => (
              <FilterPill
                key={category.id}
                label={category.name}
                checked={query.category?.includes(category.id) ?? false}
                onChange={(checked) =>
                  toggleFilter("category", category.id, checked)
                }
              />
            ))}
          </FilterSection>

          <FilterSection label="位置">
            {locations.map((location) => (
              <FilterPill
                key={location.id}
                label={location.name}
                checked={query.location?.includes(location.id) ?? false}
                onChange={(checked) =>
                  toggleFilter("location", location.id, checked)
                }
              />
            ))}
          </FilterSection>
        </div>
      )}
    </div>
  );
}

type FilterSectionProps = {
  label: string;
  children: React.ReactNode;
};

function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-(--muted)">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

type FilterPillProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function FilterPill({ label, checked, onChange }: FilterPillProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn("btn shrink-0 rounded-full px-3 py-1 text-xs", {
        "border-(--primary) text-(--primary)": checked,
      })}
    >
      {label}
    </button>
  );
}
