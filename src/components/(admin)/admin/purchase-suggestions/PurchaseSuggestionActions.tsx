"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
type Action = "purchased" | "rejected" | "delete";
const labels: Record<Action, string> = { purchased: "已購入", rejected: "不採納", delete: "刪除" };
export function PurchaseSuggestionActions({ id, version, status }: {
  id: string;
  version: number;
  status: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (!action || busy)
      return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/admin/board-games/suggests/${id}`, { method: "PATCH", body: { action, version } });
      setAction(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "處理失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap justify-end gap-2">
      {(["purchased", "rejected", "delete"] as const).filter((value) => value !== status).map((value) => <Button
        key={value}
        size="sm"
        variant={value === "delete" ? "danger" : value === "purchased" ? "primary" : "outline"}
        onClick={() => { setAction(value); setError(null); }}
      >{labels[value]}</Button>)}
    </div>
    <ConfirmDialog
      open={action !== null}
      onClose={() => {
        if (!busy)
          setAction(null);
      }}
      onConfirm={confirm}
      isSubmitting={busy}
      title={action ? labels[action] : "處理推薦"}
      confirmLabel="確認"
      confirmVariant={action === "delete" ? "danger" : "primary"}
      description={action === "delete" ? "這筆推薦將從管理清單隱藏，無法由介面復原；資料仍保留以維持額度與重複提交防護。" : action === "purchased" ? "確認已實際購入。其他同名推薦需另行確認及處理。" : "將這筆推薦標記為不採納。"}
    >
      <FormFeedback error={error} />
    </ConfirmDialog>
  </div>;
}
