"use client";

import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Event } from "@/types/database";

export function EventMoreMenu({ event, onDelete }: { event: Event; onDelete: (event: Event) => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = menuRef.current?.offsetWidth ?? 192;
    const height = menuRef.current?.offsetHeight ?? 64;
    const padding = 8;
    setPosition({
      left: Math.min(Math.max(padding, rect.right - width), window.innerWidth - width - padding),
      top: rect.bottom + height + padding <= window.innerHeight ? rect.bottom + 4 : Math.max(padding, rect.top - height - 4),
    });
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { const target = event.target as Node; if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape);
    window.addEventListener("resize", updatePosition); window.addEventListener("scroll", updatePosition, true);
    const frame = window.requestAnimationFrame(updatePosition);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", updatePosition); window.removeEventListener("scroll", updatePosition, true); };
  }, [open]);
  const menu = open && position ? createPortal(<div ref={menuRef} id={menuId} aria-label="更多活動操作" className="fixed z-50 min-w-48 max-w-[calc(100vw-1rem)] rounded-lg border border-(--border-default) bg-(--surface-default) p-2 shadow-(--shadow-card)" style={{ top: position.top, left: position.left }}><Button type="button" size="md" variant="danger" className="w-full justify-start" onClick={() => { setOpen(false); onDelete(event); }}>刪除活動</Button></div>, document.body) : null;
  return <><Button ref={triggerRef} type="button" size="sm" variant="outline" iconOnly aria-label="更多活動操作" aria-controls={menuId} aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreHorizontal aria-hidden="true" className="size-4" /></Button>{menu}</>;
}
