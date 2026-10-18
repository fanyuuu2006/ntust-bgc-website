"use client";

import { Button } from "@/components/ui/Button";
import type { ReactNode } from "react";

export function AdminMobileBulkModeButton({
  active,
  disabled = false,
  selectedCount = 0,
  selectionControl,
  onChange,
  className = "lg:hidden",
}: {
  active: boolean;
  disabled?: boolean;
  selectedCount?: number;
  selectionControl?: ReactNode;
  onChange: (active: boolean) => void;
  className?: string;
}) {
  return <div className={`${className} min-w-0`}>
    <div className="flex min-w-0 items-center justify-between gap-2 py-1">
      {active ? <div className="flex min-w-0 items-center gap-3">
        {selectionControl}
        <span className="whitespace-nowrap text-sm text-(--text-secondary)" aria-live="polite">
          已選 {selectedCount} 筆
        </span>
      </div> : <span />}
      <Button
        type="button"
        size="sm"
        variant={active ? "text" : "outline"}
        disabled={disabled}
        aria-pressed={active}
        onClick={() => onChange(!active)}
      >
        {active ? "完成" : "選取"}
      </Button>
    </div>
  </div>;
}
