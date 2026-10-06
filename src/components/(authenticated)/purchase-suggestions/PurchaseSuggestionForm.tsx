"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Field, getFieldDescribedBy } from "@/components/ui/Field";
import { FormFeedback } from "@/components/FormFeedback";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { createPurchaseSuggestionSchema } from "@/services/purchase-suggestions/purchase-suggestions.schema";
export function PurchaseSuggestionForm({ remaining }: {
  remaining: number;
}) {
  const router = useRouter();
  const request = useRef<{
    key: string;
    id: string;
  } | null>(null);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function validateField(name: "game_name" | "reason" | "reference_url", value: string) {
    const parsed = createPurchaseSuggestionSchema.shape[name].safeParse(value);
    setFieldErrors((previous) => ({ ...previous, [name]: parsed.success ? "" : parsed.error.issues[0]?.message ?? "請檢查輸入內容" }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current)
      return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const values = { game_name: fields.get("game_name"), reason: fields.get("reason"), reference_url: fields.get("reference_url") };
    const key = JSON.stringify(values);
    if (request.current?.key !== key)
      request.current = { key, id: crypto.randomUUID() };
    const parsed = createPurchaseSuggestionSchema.safeParse({ ...values, request_id: request.current.id });
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const name = String(issue.path[0]);
        errors[name] ??= issue.message;
      }
      setFieldErrors(errors);
      const first = form.elements.namedItem(Object.keys(errors)[0]);
      if (first instanceof HTMLElement)
        first.focus();
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await apiClient("/api/board-games/suggest", { method: "POST", body: { ...values, request_id: request.current.id } });
      setSuccess("已收到你的推薦，謝謝你的建議！幹部將評估是否購入。");
      form.reset();
      request.current = null;
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400 && caught.errors) {
        const errors: Record<string, string> = {};
        for (const name of ["game_name", "reason", "reference_url"] as const) {
          const messages = caught.errors[name];
          if (Array.isArray(messages) && typeof messages[0] === "string") {
            errors[name] = messages[0];
          }
        }
        setFieldErrors(errors);
        // Inputs are disabled during the request; focus after React enables them.
        const first = form.elements.namedItem(Object.keys(errors)[0] ?? "");
        if (first instanceof HTMLElement)
          requestAnimationFrame(() => first.focus());
      }
      setError(caught instanceof ApiError ? caught.message : "送出結果暫時無法確認，請保留內容後重試。");
      // Preserve this request ID when retrying a lost response.
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (<><form
    onSubmit={submit}
    noValidate
    className="space-y-4"
  >
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-(--text-muted)">本週還可推薦 {remaining} 款</p>
      <Button type="button" variant="ghost" size="sm" iconOnly aria-label="查看推薦規則" title="推薦規則" aria-haspopup="dialog" onClick={() => setRulesOpen(true)}>
        <Info aria-hidden="true" className="size-4" />
      </Button>
    </div>
    <Field
      label="桌遊名稱"
      htmlFor="suggest-game-name"
      required
      hint="最多 50 字"
      error={fieldErrors.game_name}
    >
      <Input
        id="suggest-game-name"
        name="game_name"
        required
        maxLength={100}
        disabled={busy}
        autoComplete="off"
        invalid={Boolean(fieldErrors.game_name)}
        aria-describedby={getFieldDescribedBy("suggest-game-name", "最多 50 字", fieldErrors.game_name)}
        onBlur={(event) => validateField("game_name", event.currentTarget.value)}
        onChange={(event) => {
          if (fieldErrors.game_name)
            validateField("game_name", event.currentTarget.value);
        }}
      />
    </Field>
    <Field
      label="推薦理由"
      htmlFor="suggest-reason"
      required
      hint="10–200 字"
      error={fieldErrors.reason}
    >
      <Textarea
        id="suggest-reason"
        name="reason"
        required
        maxLength={400}
        disabled={busy}
        rows={5}
        placeholder="例如遊戲特色、適合社團的原因。"
        invalid={Boolean(fieldErrors.reason)}
        aria-describedby={getFieldDescribedBy("suggest-reason", "10–200 字", fieldErrors.reason)}
        onBlur={(event) => validateField("reason", event.currentTarget.value)}
        onChange={(event) => {
          if (fieldErrors.reason)
            validateField("reason", event.currentTarget.value);
        }}
      />
    </Field>
    <Field
      label="參考連結"
      htmlFor="suggest-reference"
      hint="選填，最多 100 字"
      error={fieldErrors.reference_url}
    >
      <Input
        id="suggest-reference"
        name="reference_url"
        type="url"
        maxLength={200}
        disabled={busy}
        placeholder="https://…"
        invalid={Boolean(fieldErrors.reference_url)}
        aria-describedby={getFieldDescribedBy("suggest-reference", "選填，最多 100 字", fieldErrors.reference_url)}
        onBlur={(event) => validateField("reference_url", event.currentTarget.value)}
        onChange={(event) => {
          if (fieldErrors.reference_url)
            validateField("reference_url", event.currentTarget.value);
        }}
      />
    </Field>
    <div aria-live="polite"><FormFeedback error={error} success={success} /></div>
    <Button type="submit" isLoading={busy}>送出推薦</Button>
  </form>
    <Modal open={rulesOpen} onClose={() => setRulesOpen(false)} title="推薦規則" size="md">
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-(--text-muted)">
        <li>已登入並完成信箱驗證即可推薦，不限社員資格。</li>
        <li>每週最多推薦 3 款，每週一臺北時間 00:00 重置；兩次推薦至少間隔 60 秒。</li>
        <li>同名桌遊仍待評估，或你在最近 30 天內已推薦過，不能重複提交。</li>
        <li>送出後不能自行修改或取消；僅供具管理權限的幹部查看，不代表社團承諾購入。</li>
        <li>請勿填寫敏感個資或不當內容。被移除或已處理的推薦仍計入本週額度。</li>
      </ul>
    </Modal>
  </>);
}
