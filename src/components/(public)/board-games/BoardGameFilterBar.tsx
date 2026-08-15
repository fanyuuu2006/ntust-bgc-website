"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";
import { STATUS_META } from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { buildQueryString } from "@/utils/url";
import { cn } from "@/utils/className";
import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";

const STATUS_OPTIONS = (Object.keys(STATUS_META) as BoardGameStatus[]).map(
  (value) => ({ value, label: STATUS_META[value].label }),
);

type FilterKey = "status" | "category" | "location";

type BoardGameFilterBarProps = {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
};

export function BoardGameFilterBar({
  categories,
  locations,
  query,
}: BoardGameFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

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
    <>
      <FilterDropdown label="狀態" count={query.status?.length ?? 0}>
        {STATUS_OPTIONS.map((option) => (
          <FilterOption
            key={option.value}
            label={option.label}
            checked={query.status?.includes(option.value) ?? false}
            onChange={(checked) =>
              toggleFilter("status", option.value, checked)
            }
          />
        ))}
      </FilterDropdown>

      <FilterDropdown label="分類" count={query.category?.length ?? 0}>
        {categories.map((category) => (
          <FilterOption
            key={category.id}
            label={category.name}
            checked={query.category?.includes(category.id) ?? false}
            onChange={(checked) =>
              toggleFilter("category", category.id, checked)
            }
          />
        ))}
      </FilterDropdown>

      <FilterDropdown label="位置" count={query.location?.length ?? 0}>
        {locations.map((location) => (
          <FilterOption
            key={location.id}
            label={location.name}
            checked={query.location?.includes(location.id) ?? false}
            onChange={(checked) =>
              toggleFilter("location", location.id, checked)
            }
          />
        ))}
      </FilterDropdown>
    </>
  );
}

type FilterDropdownProps = {
  label: string;
  count: number;
  children: React.ReactNode;
};

function FilterDropdown({ label, count, children }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideDismiss<HTMLDivElement>(open, () => setOpen(false));

  const isActive = count > 0;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "btn flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm",
          {
            "border-(--primary)": isActive,
          },
        )}
      >
        {label}
        {isActive && (
          <span className="shrink-0 text-(--primary)">({count})</span>
        )}
      </button>

      {open && (
        <div className="card absolute top-[calc(100%+0.5rem)] left-0 z-10 max-h-64 w-max min-w-32 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md py-1">
          {children}
        </div>
      )}
    </div>
  );
}

type FilterOptionProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function FilterOption({ label, checked, onChange }: FilterOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap text-(--foreground) hover:bg-(--secondary-background)">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 rounded border-(--border) accent-(--primary)"
      />
      {label}
    </label>
  );
}
