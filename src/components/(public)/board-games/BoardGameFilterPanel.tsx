"use client";

import { useState } from "react";
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
import { BoardGameActiveFilters } from "@/components/(public)/board-games/BoardGameActiveFilters";
import { buildQueryString } from "@/utils/url";
import { cn } from "@/utils/className";
import { Button } from "@/components/ui/Button";

const STATUS_OPTIONS = (Object.keys(STATUS_META) as BoardGameStatus[]).map(
  (value) => ({
    value,
    label: STATUS_META[value].label,
    description: STATUS_META[value].description,
  }),
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
  function toggleFilter(key: FilterKey, value: string, checked: boolean) {
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
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            variant={filterCount > 0 || open ? "outline" : "secondary"}
            className={cn(
              "min-h-9 shrink-0 rounded-full px-3",
            )}
          >
            進階篩選
            {filterCount > 0 && (
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-(--interactive-primary) text-[10px] font-medium text-(--text-inverse)">
                {filterCount}
              </span>
            )}
          </Button>

          {filterCount > 0 && (
            <Link
              href={BASE_PATH}
              className="flex min-h-9 shrink-0 items-center px-1 text-sm font-medium text-(--text-muted) transition-colors hover:text-(--text-primary)"
            >
              重設
            </Link>
          )}
        </div>

        <BoardGameSortMenu query={query} />
      </div>

      {open ? (
        <div className="space-y-4 border-t border-(--border-muted) pt-4">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
            <FilterSection label="狀態">
              {STATUS_OPTIONS.map((option) => (
                <FilterPill
                  key={option.value}
                  label={option.label}
                  title={option.description}
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
                  title={category.description ?? undefined}
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
                  title={location.description ?? undefined}
                  checked={query.location?.includes(location.id) ?? false}
                  onChange={(checked) =>
                    toggleFilter("location", location.id, checked)
                  }
                />
              ))}
            </FilterSection>
          </div>
        </div>
      ) : (
        <BoardGameActiveFilters
          categories={categories}
          locations={locations}
          query={query}
        />
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
      <p className="text-xs font-semibold text-(--text-muted)">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

type FilterPillProps = {
  label: string;
  title?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function FilterPill({ label, title, checked, onChange }: FilterPillProps) {
  return (
    <Button
      type="button"
      aria-pressed={checked}
      title={title}
      onClick={() => onChange(!checked)}
      variant={checked ? "primary" : "secondary"}
      className="min-h-9 shrink-0 rounded-full px-3 sm:min-h-8 sm:text-xs"
    >
      {label}
    </Button>
  );
}
