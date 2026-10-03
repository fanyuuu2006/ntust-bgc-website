"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";

export function PurchaseNoticeAction({ id, noticeVersion }: { id: string; noticeVersion: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function acknowledge() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await apiClient(`/api/purchase-suggestions/${id}/read`, { method: "POST", body: { notice_version: noticeVersion } });
      router.refresh();
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "確認提醒失敗，請稍後再試"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2"><Button type="button" size="sm" variant="outline" onClick={acknowledge} isLoading={busy}>知道了</Button>{error ? <p role="alert" className="text-sm text-(--status-danger)">{error}</p> : null}</div>;
}
