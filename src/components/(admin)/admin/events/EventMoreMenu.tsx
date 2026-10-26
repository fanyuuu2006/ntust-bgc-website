"use client";

import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { useToast } from "@/contexts/ToastContext";
import type { Event } from "@/types/database";

type MenuPosition = { top: number; left: number };

export function EventMoreMenu({ event, onDelete }: { event: Event; onDelete: (event: Event) => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<"unpublish" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const router = useRouter();
  const menuId = useId();

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menu = menuRef.current;
    const width = menu?.offsetWidth ?? 192;
    const height = menu?.offsetHeight ?? 180;
    const padding = 8;
    const left = Math.min(Math.max(padding, rect.right - width), window.innerWidth - width - padding);
    const canOpenBelow = rect.bottom + height + padding <= window.innerHeight;
    const top = canOpenBelow ? rect.bottom + 4 : Math.max(padding, rect.top - height - 4);
    setPosition({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const reposition = () => updatePosition();
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    const frame = window.requestAnimationFrame(reposition);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const update = async (action: "publish" | "unpublish" | "cancel" | "restore") => {
    setBusy(true);
    try {
      const body = action === "publish" ? { publication_status: "published" } : action === "unpublish" ? { publication_status: "draft" } : { action };
      await apiClient(`/api/admin/events/${event.id}`, { method: "PATCH", body });
      const message = action === "publish" ? "活動已發布" : action === "unpublish" ? "活動已取消發布" : action === "cancel" ? "活動已取消" : "活動已恢復";
      showToast("success", message);
      setConfirm(null);
      setOpen(false);
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "活動狀態更新失敗");
    } finally {
      setBusy(false);
    }
  };

  const cancelled = Boolean(event.cancelled_at);
  const menu = open && position ? createPortal(
    <div ref={menuRef} id={menuId} aria-label="更多活動操作" className="fixed z-50 grid min-w-48 max-w-[calc(100vw-1rem)] gap-1 rounded-lg border border-(--border-default) bg-(--surface-default) p-2 shadow-(--shadow-card)" style={{ top: position.top, left: position.left }}>
      {!cancelled && event.publication_status === "draft" ? <Button type="button" size="md" variant="ghost" className="w-full justify-start" onClick={() => update("publish")}>發布活動</Button> : null}
      {!cancelled && event.publication_status === "published" ? <Button type="button" size="md" variant="ghost" className="w-full justify-start" onClick={() => setConfirm("unpublish")}>取消發布</Button> : null}
      {cancelled ? <Button type="button" size="md" variant="ghost" className="w-full justify-start" onClick={() => update("restore")}>恢復活動</Button> : <Button type="button" size="md" variant="ghost" className="w-full justify-start" onClick={() => setConfirm("cancel")}>取消活動</Button>}
      <Button type="button" size="md" variant="danger" className="mt-1 w-full justify-start border-t border-(--border-default) pt-2" onClick={() => { setOpen(false); onDelete(event); }}>刪除活動</Button>
    </div>,
    document.body,
  ) : null;

  return <>
    <Button ref={triggerRef} type="button" size="sm" variant="outline" iconOnly aria-label="更多活動操作" aria-controls={menuId} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <MoreHorizontal aria-hidden="true" className="size-4" />
    </Button>
    {menu}
    <ConfirmDialog open={confirm !== null} onClose={() => !busy && setConfirm(null)} onConfirm={() => update(confirm === "unpublish" ? "unpublish" : "cancel")} isSubmitting={busy} title={confirm === "unpublish" ? "取消發布？" : "取消活動？"} confirmLabel={confirm === "unpublish" ? "確認取消發布" : "確認取消"} confirmVariant={confirm === "unpublish" ? "primary" : "danger"} description={confirm === "unpublish" ? "取消發布後，活動將不再公開顯示。" : "活動不會被刪除，既有簽到紀錄會保留；取消後，一般使用者無法再自助簽到。"} />
  </>;
}
