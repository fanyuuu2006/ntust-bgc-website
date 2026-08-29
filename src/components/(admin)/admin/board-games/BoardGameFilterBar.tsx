"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";
import { buildQueryString } from "@/utils/url";
import { cn } from "@/utils/className";
import { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";
import { Button } from "@/components/ui/Button";

const STATUS_OPTIONS: { value: BoardGameStatus; label: string }[] = [
  { value: "available", label: "可借用" },
  { value: "borrowed", label: "已借出" },
  { value: "maintenance", label: "維護中" },
  { value: "lost", label: "遺失" },
  { value: "damaged", label: "損壞" },
  { value: "retired", label: "已除役" },
];

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

      const overrides = { [key]: next } as Partial<BoardGamesQuery>;
      const queryString = buildQueryString(
        { ...query, page: undefined },
        overrides,
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
      <Button
        type="button"
        aria-expanded={open}
        aria-pressed={isActive}
        onClick={() => setOpen((prev) => !prev)}
        variant="outline"
        size="sm"
        className={cn(
          "rounded-full",
          isActive &&
            "border-(--border-strong) bg-(--surface-subtle) text-(--interactive-primary)",
        )}
      >
        {label}
        {isActive && <span className="text-(--interactive-primary)">({count})</span>}
      </Button>

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
    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm whitespace-nowrap text-(--text-primary) hover:bg-(--surface-subtle)">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-(--border-default) accent-(--interactive-primary)"
      />
      {label}
    </label>
  );
}
