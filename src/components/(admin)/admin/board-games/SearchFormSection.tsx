import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";
import { cn } from "@/utils/className";
import Link from "next/link";

const STATUS_OPTIONS: { value: BoardGameStatus; label: string }[] = [
  { value: "available", label: "可借用" },
  { value: "borrowed", label: "借出中" },
  { value: "maintenance", label: "維修中" },
  { value: "lost", label: "遺失" },
  { value: "damaged", label: "損壞" },
  { value: "retired", label: "已除役" },
];

type SearchFormSectionProps = React.HTMLAttributes<HTMLElement> & {
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  defaultSearch?: string;
  defaultStatuses?: BoardGameStatus[];
  defaultCategoryId?: string;
  defaultLocationId?: string;
};

export const SearchFormSection = ({
  categories,
  locations,
  defaultSearch,
  defaultStatuses = [],
  defaultCategoryId,
  defaultLocationId,
  className,
  ...rest
}: SearchFormSectionProps) => {
  const hasActiveFilters =
    Boolean(defaultSearch) ||
    Boolean(defaultCategoryId) ||
    Boolean(defaultLocationId) ||
    defaultStatuses.length > 0;

  return (
    <section className={cn("p-4", className)} {...rest}>
      <form
        method="GET"
        role="search"
        aria-label="搜尋與篩選桌遊"
        className="card rounded-2xl flex flex-col gap-3 p-3 sm:p-4"
      >
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="col-span-2 sm:max-w-sm sm:flex-1">
            <label htmlFor="search" className="sr-only">
              關鍵字
            </label>
            <input
              id="search"
              name="search"
              type="search"
              defaultValue={defaultSearch}
              autoComplete="off"
              placeholder="搜尋桌遊名稱或財產編號"
              className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm outline-none transition-colors focus:border-(--primary)"
            />
          </div>

          <div>
            <label htmlFor="category" className="sr-only">
              分類
            </label>
            <select
              id="category"
              name="category"
              defaultValue={defaultCategoryId ?? ""}
              className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm outline-none transition-colors focus:border-(--primary) sm:w-36"
            >
              <option value="">全部分類</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="location" className="sr-only">
              存放位置
            </label>
            <select
              id="location"
              name="location"
              defaultValue={defaultLocationId ?? ""}
              className="w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm outline-none transition-colors focus:border-(--primary) sm:w-36"
            >
              <option value="">全部位置</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn primary rounded-lg px-4 py-2 text-center text-sm"
          >
            搜尋
          </button>

          <Link
            href="/admin/board-games/new"
            className="btn green rounded-lg px-4 py-2 text-center text-sm"
          >
            ＋ 新增桌遊
          </Link>
        </div>

        <div
          role="group"
          aria-label="依狀態篩選"
          className="flex flex-wrap items-center gap-2 border-t border-(--border) pt-3"
        >
          <span className="text-sm font-medium text-(--muted)">狀態</span>

          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="cursor-pointer">
              <input
                type="checkbox"
                name="status"
                value={option.value}
                defaultChecked={defaultStatuses.includes(option.value)}
                className="peer sr-only"
              />
              <span className="inline-flex rounded-full border border-(--border) bg-(--background) px-3 py-1.5 text-sm text-(--foreground) transition-colors peer-checked:border-(--primary) peer-checked:bg-(--primary) peer-checked:text-(--primary-background) peer-focus-visible:ring-2 peer-focus-visible:ring-(--primary)">
                {option.label}
              </span>
            </label>
          ))}

          {hasActiveFilters && (
            <Link
              href="/admin/board-games"
              className="ml-auto text-sm text-(--primary) hover:underline"
            >
              清除篩選
            </Link>
          )}
        </div>
      </form>
    </section>
  );
};
