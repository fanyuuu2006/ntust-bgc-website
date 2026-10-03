"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/FormFeedback";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { createPurchaseSuggestionSchema } from "@/services/purchase-suggestions/purchase-suggestions.schema";

export function PurchaseSuggestionForm({ remaining }: { remaining: number }) {
  const router = useRouter();
  const request = useRef<{ key: string; id: string } | null>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const values = { game_name: fields.get("game_name"), reason: fields.get("reason"), reference_url: fields.get("reference_url") };
    const key = JSON.stringify(values);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    const parsed = createPurchaseSuggestionSchema.safeParse({ ...values, request_id: request.current.id });
    setError(null); setSuccess(null);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "請檢查輸入內容"); return; }
    submitting.current = true; setBusy(true);
    try {
      await apiClient("/api/purchase-suggestions", { method: "POST", body: { ...values, request_id: request.current.id } });
      setSuccess("已收到你的推薦！若社團購入，會在你回到網站時顯示提醒。");
      form.reset(); request.current = null; router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "送出結果暫時無法確認，請保留內容後重試。");
      // Preserve this request ID when retrying a lost response.
    } finally { submitting.current = false; setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-(--text-muted)">本週還可推薦 {remaining} 款。每週一臺北時間 00:00 重置；送出後不能自行修改或取消。</p>
      <label className="block space-y-2"><span className="font-medium">桌遊名稱（必填，最多 120 字）</span><Input name="game_name" required maxLength={240} disabled={busy} autoComplete="off" /></label>
      <label className="block space-y-2"><span className="font-medium">推薦理由（必填，10–1,000 字）</span><Textarea name="reason" required maxLength={2000} disabled={busy} rows={5} placeholder="例如遊戲特色，以及適合社團的原因。請勿填寫敏感個資。" /></label>
      <label className="block space-y-2"><span className="font-medium">參考連結（選填，最多 500 字）</span><Input name="reference_url" type="url" maxLength={500} disabled={busy} placeholder="https://…" /></label>
      <p className="text-sm leading-6 text-(--text-muted)">推薦僅供本人與具管理權限的幹部查看，不代表社團承諾購入。垃圾或不當內容可能被移除，仍計入推薦額度。</p>
      <div aria-live="polite"><FormFeedback error={error} success={success} /></div>
      <Button type="submit" isLoading={busy}>送出推薦</Button>
    </form>
  );
}
