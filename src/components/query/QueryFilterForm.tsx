"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import {
  getOwnedQueryStateKey,
  type AppliedQuery,
} from "@/libs/query-navigation";
import { cn } from "@/utils/className";

type FilterDraftControl = {
  name?: string;
  type?: string;
  value?: string;
  checked?: boolean;
  options?: ArrayLike<{ selected: boolean }>;
};

type QueryFilterFormProps = Omit<React.ComponentProps<"form">, "children"> & {
  appliedQuery: AppliedQuery;
  ownedKeys: readonly string[];
  clearHref: string;
  children: React.ReactNode;
  actionsClassName?: string;
};

export function clearOwnedFilterDraft(
  controls: readonly FilterDraftControl[],
  ownedKeys: readonly string[],
) {
  const owned = new Set(ownedKeys);

  for (const control of controls) {
    if (!control.name || !owned.has(control.name)) continue;

    if (control.type === "checkbox" || control.type === "radio") {
      control.checked = false;
      continue;
    }

    if (control.type === "select-multiple" && control.options) {
      for (const option of Array.from(control.options)) option.selected = false;
      continue;
    }

    if (typeof control.value === "string") control.value = "";
  }
}

export function QueryFilterForm({
  appliedQuery,
  ownedKeys,
  clearHref,
  children,
  className,
  actionsClassName,
  ...props
}: QueryFilterFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const appliedStateKey = getOwnedQueryStateKey(appliedQuery, ownedKeys);

  return (
    <form
      key={appliedStateKey}
      ref={formRef}
      className={className}
      {...props}
    >
      {children}
      <div
        className={cn(
          "flex flex-col-reverse gap-2 border-t border-(--border-default) pt-3 sm:flex-row sm:justify-end",
          actionsClassName,
        )}
      >
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => {
            const controls = formRef.current
              ? Array.from(formRef.current.elements).map(
                  (control) => control as unknown as FilterDraftControl,
                )
              : [];
            clearOwnedFilterDraft(controls, ownedKeys);
            router.push(clearHref);
          }}
        >
          清除篩選
        </Button>
        <Button type="submit" variant="primary" className="w-full sm:w-auto">
          套用篩選
        </Button>
      </div>
    </form>
  );
}
