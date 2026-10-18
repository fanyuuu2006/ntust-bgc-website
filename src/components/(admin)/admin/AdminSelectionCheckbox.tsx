"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/utils/className";

type AdminSelectionCheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "checked" | "onChange" | "type"
> & {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  containerClassName?: string;
};

export function AdminSelectionCheckbox({
  checked,
  indeterminate = false,
  label,
  onCheckedChange,
  containerClassName,
  className,
  disabled,
  ...props
}: AdminSelectionCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={cn(
        "inline-flex min-h-8 min-w-8 shrink-0 cursor-pointer items-center justify-center rounded-md",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)",
        disabled && "cursor-not-allowed opacity-60",
        containerClassName,
      )}
    >
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className={cn(
          "size-4 rounded border-(--border-default) accent-(--interactive-primary) outline-none focus-visible:outline-none",
          className,
        )}
      />
    </label>
  );
}
