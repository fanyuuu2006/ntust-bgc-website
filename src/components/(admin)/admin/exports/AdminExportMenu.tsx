"use client";

import { ChevronDown, Download } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/className";
import type { AdminExportDomain } from "@/services/admin-exports/admin-exports.service";

type Props = {
  domain: AdminExportDomain;
  query?: Record<string, string | number | boolean | null | undefined>;
  className?: string;
};

const formats = [
  ["csv", "CSV"],
  ["xlsx", "Excel (.xlsx)"],
  ["json", "JSON"],
] as const;

export function AdminExportMenu({ domain, query = {}, className }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function href(format: string) {
    const params = new URLSearchParams({ format });
    for (const [key, value] of Object.entries(query)) {
      if (key === "page" || key === "pageSize" || value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
    return `/api/admin/exports/${domain}?${params}`;
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Download aria-hidden="true" className="size-4" />
        匯出
        <ChevronDown aria-hidden="true" className="size-4" />
      </Button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 z-30 mt-2 w-44 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-(--border) bg-(--background) p-1 shadow-(--shadow-card)"
        >
          {formats.map(([format, label]) => (
            <a key={format} href={href(format)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="block min-h-11 rounded-lg px-3 py-2.5 text-sm hover:bg-(--secondary-background) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--primary)">
              {label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
