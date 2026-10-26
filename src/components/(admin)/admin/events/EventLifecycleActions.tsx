"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { useToast } from "@/contexts/ToastContext";
import type { Event } from "@/types/database";

export function EventLifecycleActions({ event }: { event: Event }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [action, setAction] = useState<"cancel" | "restore" | null>(null);
  const [busy, setBusy] = useState(false);
  const runAction = async () => {
    if (!action) return;
    setBusy(true);
    try {
      await apiClient(`/api/admin/events/${event.id}`, { method: "PATCH", body: { action } });
      showToast("success", action === "cancel" ? "?????" : "?????");
      setAction(null);
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "????????");
    } finally { setBusy(false); }
  };
  return (
    <>
      <Button type="button" size="sm" variant={event.cancelled_at ? "outline" : "danger"} onClick={() => setAction(event.cancelled_at ? "restore" : "cancel")}>
        {event.cancelled_at ? "????" : "????"}
      </Button>
      <ConfirmDialog open={action !== null} onClose={() => !busy && setAction(null)} onConfirm={runAction} isSubmitting={busy} title={action === "cancel" ? "?????" : "?????"} confirmLabel={action === "cancel" ? "????" : "????"} confirmVariant={action === "cancel" ? "danger" : "primary"} description={action === "cancel" ? "???????????????????????????????????" : "???????????????????????????"} />
    </>
  );
}
