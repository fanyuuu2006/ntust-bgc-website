"use client";

import { useId, useState } from "react";
import { ListFilter } from "lucide-react";

import { Button } from "@/components/ui/Button";

type FilterOption = {
  value: string;
  label: string;
};

type BoardGameFilterDisclosureProps = {
  statusOptions: FilterOption[];
  categoryOptions: FilterOption[];
  locationOptions: FilterOption[];
  selectedStatuses?: string[];
  selectedCategories?: string[];
  selectedLocations?: string[];
};

export function BoardGameFilterDisclosure({
  statusOptions,
  categoryOptions,
  locationOptions,
  selectedStatuses,
  selectedCategories,
  selectedLocations,
}: BoardGameFilterDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
        className="w-full shrink-0 whitespace-nowrap sm:w-auto"
      >
        <ListFilter aria-hidden="true" className="size-4" />
        篩選
      </Button>

      <div
        id={panelId}
        hidden={!isOpen}
        className="order-last col-span-full grid min-w-0 gap-3 rounded-xl border border-(--border-default) bg-(--surface-default) p-3 sm:grid-cols-3 lg:absolute lg:right-0 lg:top-full lg:z-20 lg:mt-3 lg:w-[min(40rem,calc(100vw-2rem))] lg:shadow-(--shadow-card)"
      >
        <FilterGroup label="狀態">
          {statusOptions.map((option) => (
            <FilterCheckbox
              key={option.value}
              name="status"
              option={option}
              defaultChecked={selectedStatuses?.includes(option.value)}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="類型">
          {categoryOptions.map((option) => (
            <FilterCheckbox
              key={option.value}
              name="category"
              option={option}
              defaultChecked={selectedCategories?.includes(option.value)}
            />
          ))}
        </FilterGroup>
        <FilterGroup label="位置">
          {locationOptions.map((option) => (
            <FilterCheckbox
              key={option.value}
              name="location"
              option={option}
              defaultChecked={selectedLocations?.includes(option.value)}
            />
          ))}
        </FilterGroup>
      </div>
    </>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0 space-y-1.5">
      <legend className="text-xs font-semibold text-(--text-muted)">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 sm:grid-cols-1">
        {children}
      </div>
    </fieldset>
  );
}

function FilterCheckbox({
  name,
  option,
  defaultChecked,
}: {
  name: string;
  option: FilterOption;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-8 min-w-0 items-center gap-2 text-sm text-(--text-primary)">
      <input
        className="shrink-0"
        type="checkbox"
        name={name}
        value={option.value}
        defaultChecked={defaultChecked}
      />
      <span className="min-w-0 break-words">{option.label}</span>
    </label>
  );
}
