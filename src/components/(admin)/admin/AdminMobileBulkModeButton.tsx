"use client";

import { Button } from "@/components/ui/Button";

export function AdminMobileBulkModeButton({
  active,
  disabled = false,
  onChange,
  className = "lg:hidden",
}: {
  active: boolean;
  disabled?: boolean;
  onChange: (active: boolean) => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "ghost" : "outline"}
      disabled={disabled}
      aria-pressed={active}
      className={className}
      onClick={() => onChange(!active)}
    >
      {active ? "結束批次管理" : "批次管理"}
    </Button>
  );
}
