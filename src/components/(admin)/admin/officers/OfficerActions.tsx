"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import type { AcademicYear, User } from "@/types/database";

type Officer = { id: string; title: string; user: User; academic_year: AcademicYear | null };

export function OfficerActions({ officer, users, years }: { officer?: Officer; users: User[]; years: AcademicYear[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({ user_id: officer?.user.id ?? "", academic_year_id: officer?.academic_year?.id ?? years.find((year) => year.is_current)?.id ?? "", title: officer?.title ?? "" });
  const closeForm = () => { if (!busy) { setError(null); setOpen(false); } };
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await apiClient(officer ? `/api/admin/officers/${officer.id}` : "/api/admin/officers", { method: officer ? "PATCH" : "POST", body: values });
      setOpen(false); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "儲存幹部職位失敗。"); }
    finally { setBusy(false); }
  }
  async function removeOfficer() {
    if (!officer) return;
    setBusy(true); setError(null);
    try { await apiClient(`/api/admin/officers/${officer.id}`, { method: "DELETE" }); setRemoveOpen(false); router.refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "刪除幹部職位失敗。"); }
    finally { setBusy(false); }
  }
  return <>
    <Button type="button" size="sm" variant={officer ? "outline" : "primary"} onClick={() => { setError(null); setOpen(true); }}>{officer ? "編輯" : "新增幹部"}</Button>
    {officer && <Button type="button" size="sm" variant="danger" onClick={() => setRemoveOpen(true)}>刪除</Button>}
    <Modal open={open} onClose={closeForm} title={officer ? "編輯幹部職位" : "新增幹部職位"}>
      <form onSubmit={save} className="space-y-4">
        {!officer && <Field label="使用者" htmlFor="officer-user"><Select id="officer-user" className="w-full" required value={values.user_id} disabled={busy} onChange={(event) => setValues({ ...values, user_id: event.target.value })}><option value="">請選擇使用者</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}（{user.email}）</option>)}</Select></Field>}
        <Field label="學年度" htmlFor="officer-year"><Select id="officer-year" className="w-full" value={values.academic_year_id} disabled={busy} onChange={(event) => setValues({ ...values, academic_year_id: event.target.value })}>{years.map((year) => <option key={year.id} value={year.id}>{year.year}</option>)}</Select></Field>
        <Field label="職位" htmlFor="officer-title"><Input id="officer-title" className="w-full" required value={values.title} disabled={busy} onChange={(event) => setValues({ ...values, title: event.target.value })} /></Field>
        <FormFeedback error={error} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={busy} onClick={closeForm}>取消</Button><Button type="submit" isLoading={busy}>{officer ? (busy ? "儲存中…" : "儲存") : (busy ? "新增中…" : "新增")}</Button></div>
      </form>
    </Modal>
    <ConfirmDialog open={removeOpen} onClose={() => !busy && setRemoveOpen(false)} onConfirm={removeOfficer} isSubmitting={busy} title="刪除幹部職位？" description={officer ? `確定要刪除「${officer.title}」嗎？` : ""} />
  </>;
}
