"use client";

import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";
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
  const menuRef = useOutsideDismiss<HTMLDivElement>(open, () => setOpen(false));

  function href(format: string) {
    const params = new URLSearchParams({ format });
    for (const [key, value] of Object.entries(query)) {
      if (key === "page" || key === "pageSize" || value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
    return `/api/admin/exports/${domain}?${params}`;
  }

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <Button type="button" variant="outline" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Download aria-hidden="true" className="size-4" />
        匯出目前篩選結果
        <ChevronDown aria-hidden="true" className="size-4" />
      </Button>
      {open ? (
        <div role="menu" aria-label="選擇匯出格式" className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-(--border) bg-(--background) p-1 shadow-(--shadow-card)">
          {formats.map(([format, label]) => (
            <a key={format} role="menuitem" href={href(format)} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-(--secondary-background) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--primary)">
              {label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
