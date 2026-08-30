"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MembershipDeleteAction({ membershipId }: { membershipId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/admin/memberships/${membershipId}`, { method: "DELETE" });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "刪除社員資格失敗。");
    } finally {
      setBusy(false);
    }
  }

  return <>
    {error && <p role="alert" className="text-xs text-(--game-red)">{error}</p>}
    <Button type="button" size="sm" variant="danger" onClick={() => { setError(null); setOpen(true); }}>刪除</Button>
    <ConfirmDialog
      open={open}
      onClose={() => !busy && setOpen(false)}
      onConfirm={confirm}
      isSubmitting={busy}
      title="刪除社員資格？"
      description="僅限誤建、重複或測試資料。此操作無法復原。"
      confirmLabel="確認刪除"
    />
  </>;
}
