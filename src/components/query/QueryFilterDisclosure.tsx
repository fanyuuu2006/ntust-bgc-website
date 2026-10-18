"use client";

import { ListFilter } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/className";

type QueryFilterDisclosureProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  label?: string;
  panelClassName?: string;
};

export function QueryFilterDisclosure({
  children,
  className,
  label = "篩選",
  panelClassName,
  ...props
}: QueryFilterDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      className={cn("contents lg:relative lg:block", className)}
      {...props}
    >
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full shrink-0 whitespace-nowrap lg:w-auto"
        onClick={() => setIsOpen((current) => !current)}
      >
        <ListFilter aria-hidden="true" className="size-4 shrink-0" />
        {label}
      </Button>
      {isOpen ? (
        <div
          id={panelId}
          className={cn(
            "col-span-full grid w-full min-w-0 max-w-full gap-3 rounded-xl border border-(--border-default) bg-(--surface-default) p-3 lg:absolute lg:right-0 lg:top-full lg:z-20 lg:mt-2 lg:w-max lg:max-w-[calc(100vw-2rem)] lg:min-w-64 lg:shadow-(--shadow-card)",
            panelClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
