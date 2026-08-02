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

const fieldClassName =
  "w-full rounded-lg border border-(--border) bg-(--background) px-3 py-2 text-sm outline-none transition-colors focus:border-(--primary)";

type FilterSelectProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  options: { id: string; name: string }[];
};

const FilterSelect = ({
  id,
  name,
  label,
  placeholder,
  defaultValue,
  options,
}: FilterSelectProps) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-(--foreground)">
      {label}
    </label>
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className={fieldClassName}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  </div>
);

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
  const activeFilterGroupCount =
    (defaultCategoryId ? 1 : 0) +
    (defaultLocationId ? 1 : 0) +
    (defaultStatuses.length > 0 ? 1 : 0);

  const hasActiveFilters = Boolean(defaultSearch) || activeFilterGroupCount > 0;

  const formKey = [
    defaultSearch ?? "",
    defaultCategoryId ?? "",
    defaultLocationId ?? "",
    [...defaultStatuses].sort().join(","),
  ].join("|");

  return (
    <section className={cn("px-4", className)} {...rest}>
      <form
        key={formKey}
        method="GET"
        role="search"
        aria-label="搜尋與篩選桌遊"
        className="card rounded-2xl flex flex-col gap-3 p-3 sm:p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:max-w-sm sm:flex-1">
            <label htmlFor="search" className="sr-only">
              關鍵字
            </label>
            <input
              id="search"
              name="search"
              type="search"
              defaultValue={defaultSearch}
              autoComplete="off"
              placeholder="搜尋桌遊名稱或社產編號"
              className={fieldClassName}
            />
          </div>

          <div className="flex gap-2">
            <details
              className="relative flex-1 sm:flex-none"
              open={activeFilterGroupCount > 0}
            >
              <summary className="btn outline flex items-center justify-center rounded-lg px-4 py-2 text-sm">
                篩選
                {activeFilterGroupCount > 0
                  ? `（${activeFilterGroupCount}）`
                  : ""}
              </summary>

              <div
                className={cn(
                  "absolute left-0 top-[calc(100%+0.5rem)] z-50 w-full min-w-64 max-w-[calc(100vw-2rem)]",
                  "card rounded-xl p-3 shadow-(--shadow-hover)",
                  "flex flex-col gap-3",
                )}
              >
                <FilterSelect
                  id="category"
                  name="category"
                  label="分類"
                  placeholder="全部分類"
                  defaultValue={defaultCategoryId ?? ""}
                  options={categories}
                />

                <FilterSelect
                  id="location"
                  name="location"
                  label="存放位置"
                  placeholder="全部位置"
                  defaultValue={defaultLocationId ?? ""}
                  options={locations}
                />

                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium text-(--foreground)">
                    狀態
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((option) => (
                      <label key={option.value} className="cursor-pointer">
                        <input
                          type="checkbox"
                          name="status"
                          value={option.value}
                          defaultChecked={defaultStatuses.includes(
                            option.value,
                          )}
                          className="peer sr-only"
                        />
                        <span className="flex rounded-full border border-(--border) bg-(--background) px-3 py-1 text-sm text-(--foreground) transition-colors peer-checked:border-(--primary) peer-checked:bg-(--primary) peer-checked:text-(--primary-background) peer-focus-visible:ring-2 peer-focus-visible:ring-(--primary)">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {hasActiveFilters && (
                  <Link
                    href="/admin/board-games"
                    className="border-t border-(--border) pt-2 text-sm text-(--primary) hover:underline"
                  >
                    清除篩選
                  </Link>
                )}
              </div>
            </details>

            <button
              type="submit"
              className="btn primary flex-1 shrink-0 rounded-lg px-4 py-2 text-sm sm:flex-none"
            >
              搜尋
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
