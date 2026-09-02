"use client";

import { usePathname, useRouter } from "next/navigation";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/(admin)/admin/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";
import { buildQueryString } from "@/utils/url";

const STATUS_OPTIONS: Array<{ value: BoardGameStatus; label: string }> = [
  { value: "available", label: "可借用" },
  { value: "borrowed", label: "已借出" },
  { value: "maintenance", label: "維護中" },
  { value: "lost", label: "遺失" },
  { value: "damaged", label: "損壞" },
  { value: "retired", label: "已除役" },
];

type BoardGameSearchFormProps = {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  query: BoardGamesQuery;
  clearSearchHref: string;
};

export function BoardGameSearchForm({
  categories,
  locations,
  query,
  clearSearchHref,
}: BoardGameSearchFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const queryString = buildQueryString({
      search: String(formData.get("search") ?? "").trim() || undefined,
      status: String(formData.get("status") ?? "").trim() || undefined,
      category: String(formData.get("category") ?? "").trim() || undefined,
      location: String(formData.get("location") ?? "").trim() || undefined,
      orderBy: query.orderBy,
      orderDirection: query.orderDirection,
      pageSize: query.pageSize,
    });

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <form onSubmit={handleSubmit}>
      <AdminToolbar className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <ClearableSearchInput
            id="board-game-search"
            initialValue={query.search}
            clearHref={clearSearchHref}
            name="search"
            placeholder="搜尋桌遊名稱、社產編號或描述"
            aria-label="搜尋桌遊名稱、社產編號或描述"
            className="w-full"
          />
          <Button type="submit" variant="primary" className="w-full md:w-auto">搜尋</Button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FilterSelect name="status" ariaLabel="狀態" value={query.status}>
            <option value="">全部狀態</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>
          <FilterSelect name="category" ariaLabel="分類" value={query.category}>
            <option value="">全部分類</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect name="location" ariaLabel="位置" value={query.location}>
            <option value="">全部位置</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </FilterSelect>
        </div>
      </AdminToolbar>
    </form>
  );
}

function FilterSelect({
  name,
  ariaLabel,
  value,
  children,
}: {
  name: string;
  ariaLabel: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <Select
      name={name}
      aria-label={ariaLabel}
      defaultValue={value ?? ""}
      className="w-full"
    >
      {children}
    </Select>
  );
}
