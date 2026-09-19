"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/className";

type ClearableSearchInputProps = {
  initialValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  clearHref?: string;
  name?: string;
  id?: string;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  "aria-label"?: string;
};

export function ClearableSearchInput({
  initialValue = "",
  ...props
}: ClearableSearchInputProps) {
  return <ClearableSearchInputControl key={initialValue} initialValue={initialValue} {...props} />;
}

function ClearableSearchInputControl({
  initialValue = "",
  value: controlledValue,
  onValueChange,
  onClear,
  clearHref,
  name,
  id,
  placeholder,
  className,
  inputClassName,
  disabled,
  onKeyDown,
  "aria-label": ariaLabel,
}: ClearableSearchInputProps) {
  const router = useRouter();
  const [localValue, setLocalValue] = useState(initialValue);
  const value = controlledValue ?? localValue;
  const hasValue = value.trim().length > 0;

  function updateValue(nextValue: string) {
    if (controlledValue === undefined) setLocalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <div className={cn("relative min-w-0 w-full", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--text-muted)"
      />
      <Input
        type="search"
        autoComplete="off"
        name={hasValue ? name : undefined}
        id={id}
        value={value}
        onInput={(event) => updateValue(event.currentTarget.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("pl-9", hasValue && "pr-10", inputClassName)}
      />
      {hasValue && (
        <button
          type="button"
          aria-label="清除搜尋"
          disabled={disabled}
          onClick={() => {
            updateValue("");
            onClear?.();
            if (!onClear && clearHref) router.replace(clearHref);
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-(--text-muted) transition-colors hover:bg-(--surface-subtle) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
