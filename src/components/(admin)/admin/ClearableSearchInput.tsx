"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { cn } from "@/utils/className";

type ClearableSearchInputProps = {
  initialValue?: string;
  clearHref: string;
  name: string;
  id?: string;
  placeholder: string;
  className?: string;
  inputClassName?: string;
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
  clearHref,
  name,
  id,
  placeholder,
  className,
  inputClassName,
  "aria-label": ariaLabel,
}: ClearableSearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const hasValue = value.trim().length > 0;

  return (
    <div className={cn("relative w-full", className)}>
      <Input
        name={hasValue ? name : undefined}
        id={id}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(hasValue && "pr-10", inputClassName)}
      />
      {hasValue && (
        <button
          type="button"
          aria-label="清除搜尋"
          onClick={() => {
            setValue("");
            router.replace(clearHref);
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-lg leading-none text-(--text-muted) transition-colors hover:bg-(--surface-subtle) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
        >
          ×
        </button>
      )}
    </div>
  );
}
