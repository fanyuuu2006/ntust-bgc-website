import Link from "next/link";
import type { BoardGameCategory, BoardGameLocation } from "@/types/database";
import { BASE_PATH, STATUS_META } from "@/app/(public)/board-games/constants";
import type { BoardGamesQuery } from "@/app/(public)/board-games/types";
import { buildQueryString } from "@/utils/url";

type BoardGameActiveFiltersProps = {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
};

type FilterChip = {
  key: string;
  label: string;
  value: string;
  href: string;
};

function removeHref(
  query: BoardGamesQuery,
  key: "status" | "category" | "location",
  value: string,
) {
  const current = query[key] ?? [];
  const next = current.filter((item) => item !== value);
  const queryString = buildQueryString(
    { ...query, page: 1 },
    {
      [key]: next,
    },
  );
  return queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;
}

export function BoardGameActiveFilters({
  categories,
  locations,
  query,
}: BoardGameActiveFiltersProps) {
  const chips: FilterChip[] = [
    ...(query.status ?? []).map((status) => ({
      key: `status-${status}`,
      label: "狀態",
      value: STATUS_META[status].label,
      href: removeHref(query, "status", status),
    })),
    ...(query.category ?? []).map((categoryId) => ({
      key: `category-${categoryId}`,
      label: "分類",
      value:
        categories.find((item) => item.id === categoryId)?.name ?? categoryId,
      href: removeHref(query, "category", categoryId),
    })),
    ...(query.location ?? []).map((locationId) => ({
      key: `location-${locationId}`,
      label: "位置",
      value:
        locations.find((item) => item.id === locationId)?.name ?? locationId,
      href: removeHref(query, "location", locationId),
    })),
  ];

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="flex btn shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs"
        >
          <span className="shrink-0 font-semibold text-(--primary)">
            {chip.label}
          </span>
          <span className="shrink-0 text-(--muted)">|</span>
          <span>{chip.value}</span>
          <span className="shrink-0 text-(--muted)">×</span>
        </Link>
      ))}
    </div>
  );
}
