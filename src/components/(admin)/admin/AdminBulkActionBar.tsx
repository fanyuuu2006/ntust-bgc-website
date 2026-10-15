"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/className";

export function AdminBulkActionBar({
  selectedCount,
  disabled = false,
  onClear,
  selectionControl,
  children,
  notice,
  className,
}: {
  selectedCount: number;
  disabled?: boolean;
  onClear: () => void;
  selectionControl?: ReactNode;
  children: ReactNode;
  notice?: ReactNode;
  className?: string;
}) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-2 border-y border-(--border-default) bg-(--surface-subtle) px-1 py-2 sm:px-2",
        className,
      )}
      role="region"
      aria-label="批次操作"
    >
      {selectionControl}
      <p className="shrink-0 text-sm font-medium text-(--text-primary)" aria-live="polite">
        已選取 {selectedCount} 筆
      </p>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
        {children}
        <Button type="button" size="sm" variant="text" disabled={disabled} onClick={onClear}>
          清除選取
        </Button>
      </div>
      {notice ? <div className="basis-full text-sm text-(--danger)" role="alert">{notice}</div> : null}
    </div>
  );
}
