"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { useToast } from "@/contexts/ToastContext";
import type { Event } from "@/types/database";

export function EventMoreMenu({ event, onDelete }: { event: Event; onDelete: (event: Event) => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<"unpublish" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [open]);

  const update = async (action: "publish" | "unpublish" | "cancel" | "restore") => {
    setBusy(true);
    try {
      const body = action === "publish" ? { publication_status: "published" } : action === "unpublish" ? { publication_status: "draft" } : { action };
      await apiClient(`/api/admin/events/${event.id}`, { method: "PATCH", body });
      const message = action === "publish" ? "?????" : action === "unpublish" ? "???????" : action === "cancel" ? "?????" : "?????";
      showToast("success", message);
      setConfirm(null);
      setOpen(false);
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "????????");
    } finally { setBusy(false); }
  };

  const cancelled = Boolean(event.cancelled_at);
  return <div ref={ref} className="relative">
    <Button type="button" size="sm" variant="outline" iconOnly aria-label="??????" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <MoreHorizontal aria-hidden="true" className="size-4" />
    </Button>
    {open ? <div role="menu" className="absolute right-0 z-20 mt-1 grid min-w-48 max-w-[calc(100vw-1rem)] gap-1 rounded-lg border border-(--border-default) bg-(--surface-default) p-2 shadow-(--shadow-card)">
      {!cancelled && event.publication_status === "draft" ? <Button type="button" size="md" variant="ghost" className="w-full justify-start" role="menuitem" onClick={() => update("publish")}>????</Button> : null}
      {!cancelled && event.publication_status === "published" ? <Button type="button" size="md" variant="ghost" className="w-full justify-start" role="menuitem" onClick={() => setConfirm("unpublish")}>????</Button> : null}
      {cancelled ? <Button type="button" size="md" variant="ghost" className="w-full justify-start" role="menuitem" onClick={() => update("restore")}>????</Button> : <Button type="button" size="md" variant="ghost" className="w-full justify-start" role="menuitem" onClick={() => setConfirm("cancel")}>????</Button>}
      <Button type="button" size="md" variant="danger" className="mt-1 w-full justify-start border-t border-(--border-default) pt-2" role="menuitem" onClick={() => { setOpen(false); onDelete(event); }}>????</Button>
    </div> : null}
    <ConfirmDialog open={confirm !== null} onClose={() => !busy && setConfirm(null)} onConfirm={() => update(confirm === "unpublish" ? "unpublish" : "cancel")} isSubmitting={busy} title={confirm === "unpublish" ? "?????" : "?????"} confirmLabel={confirm === "unpublish" ? "??????" : "????"} confirmVariant={confirm === "unpublish" ? "primary" : "danger"} description={confirm === "unpublish" ? "????????????????" : "???????????????????????????????????"} />
  </div>;
}
