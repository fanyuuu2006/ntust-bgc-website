"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import type { MembershipRegisterKeyWithAcademicYear } from "@/services/memberships/memberships.types";
import type { AcademicYear } from "@/types/database";
import { cn } from "@/utils/className";

type RegisterKeyGenerateFormProps = {
  academicYears: AcademicYear[];
  defaultAcademicYearId?: string;
};

export function RegisterKeyGenerateForm({ academicYears, defaultAcademicYearId }: RegisterKeyGenerateFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"generate" | "results">("generate");
  const [academicYearId, setAcademicYearId] = useState(defaultAcademicYearId ?? academicYears[0]?.id ?? "");
  const [count, setCount] = useState("20");
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copyResetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
  }, []);

  function close() {
    if (!busy) {
      setOpen(false);
      setError(null);
    }
  }

  async function copyGeneratedKeys() {
    if (!generatedKeys.length) return;
    try {
      await navigator.clipboard.writeText(generatedKeys.join("\n"));
      setCopyError(null);
      setCopied(true);
      if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
      copyResetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError("無法複製序號，請確認瀏覽器剪貼簿權限後再試。");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await apiClient<{ data: MembershipRegisterKeyWithAcademicYear[] }>("/api/admin/members/register-keys", {
        method: "POST",
        body: { academic_year_id: academicYearId, count: Number(count) },
      });
      setGeneratedKeys(response.data.map((item) => item.register_key));
      setCopyError(null);
      setCopied(false);
      setView("results");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "產生社員註冊序號失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" className="rounded-lg" onClick={() => {
          setError(null);
          setCopyError(null);
          setCopied(false);
          setView("generate");
          setOpen(true);
        }}>
          產生社員註冊序號
        </Button>
      </div>

      <Modal open={open} onClose={close} title="社員註冊序號" description={view === "generate" ? "選擇學年度與數量後，系統會產生僅能使用一次的社員註冊序號。" : undefined} size="sm" contentClassName="max-h-[68dvh] overflow-y-auto">
        <div className="mb-3 flex gap-1 rounded-lg bg-(--surface-subtle) p-1" role="group" aria-label="社員註冊序號視圖">
          <button type="button" aria-pressed={view === "generate"} className={cn("min-h-10 flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)", view === "generate" ? "border-(--border-default) bg-(--surface-default) font-semibold text-(--text-primary)" : "border-transparent font-medium text-(--text-secondary) hover:bg-(--surface-default) hover:text-(--text-primary)")} onClick={() => setView("generate")}>產生序號</button>
          <button type="button" aria-pressed={view === "results"} disabled={!generatedKeys.length} className={cn("min-h-10 flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)", view === "results" ? "border-(--border-default) bg-(--surface-default) font-semibold text-(--text-primary)" : "border-transparent font-medium text-(--text-secondary) hover:bg-(--surface-default) hover:text-(--text-primary)", "disabled:cursor-not-allowed disabled:opacity-50")} onClick={() => setView("results")}>上一批結果</button>
        </div>
        {view === "generate" ? (
          <form onSubmit={submit} className="space-y-4">
            <Field label="學年度" htmlFor="register-key-year" required>
              <Select id="register-key-year" required value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)} disabled={busy}>
                <option value="">請選擇學年度</option>
                {academicYears.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度{year.is_current ? "（目前）" : ""}</option>)}
              </Select>
            </Field>
            <Field label="產生數量" htmlFor="register-key-count" required>
              <Input id="register-key-count" required type="number" min={1} max={100} value={count} onChange={(event) => setCount(event.target.value)} disabled={busy} />
            </Field>
            <FormFeedback error={error} />
            <div className="flex flex-row justify-end gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={close}>取消</Button>
              <Button type="submit" disabled={busy || !academicYearId} isLoading={busy}>產生序號</Button>
            </div>
          </form>
        ) : (
          <div role="tabpanel" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">共 {generatedKeys.length} 組序號</p>
              <Button type="button" variant="outline" size="sm" onClick={copyGeneratedKeys} disabled={!generatedKeys.length}>{copied ? `已複製 ${generatedKeys.length} 組` : "複製全部"}</Button>
            </div>
                <p aria-live="polite" className="sr-only">{copied ? `已複製 ${generatedKeys.length} 組社員註冊序號` : `已產生 ${generatedKeys.length} 組社員註冊序號`}</p>
            {copyError ? <p role="alert" className="text-sm text-(--status-danger)">{copyError}</p> : null}
            <pre className="max-h-[45dvh] overflow-auto whitespace-pre-wrap break-all rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3 font-mono text-xs leading-6">{generatedKeys.join("\n")}</pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
