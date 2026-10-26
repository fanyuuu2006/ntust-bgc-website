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
      showToast("success", action === "cancel" ? "活動已取消" : "活動已恢復");
      setAction(null);
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "活動狀態更新失敗");
    } finally { setBusy(false); }
  };
  return (
    <>
      <Button type="button" size="sm" variant={event.cancelled_at ? "outline" : "danger"} onClick={() => setAction(event.cancelled_at ? "restore" : "cancel")}>
        {event.cancelled_at ? "恢復活動" : "取消活動"}
      </Button>
      <ConfirmDialog open={action !== null} onClose={() => !busy && setAction(null)} onConfirm={runAction} isSubmitting={busy} title={action === "cancel" ? "取消活動？" : "恢復活動？"} confirmLabel={action === "cancel" ? "確認取消" : "確認恢復"} confirmVariant={action === "cancel" ? "danger" : "primary"} description={action === "cancel" ? "活動不會被刪除，既有簽到紀錄會保留；取消後，一般使用者無法再自助簽到。" : "恢復後將保留原本的發布狀態，並依既有規則判斷是否允許自助簽到。"} />
    </>
  );
}
