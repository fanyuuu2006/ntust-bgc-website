"use client";

import { useState } from "react";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import type { AcademicYear, User } from "@/types/database";

export function OfficerCreateButton({ users, years }: { users: User[]; years: AcademicYear[] }) {
  const currentYearId = years.find((year) => year.is_current)?.id ?? "";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({ user_id: "", academic_year_id: currentYearId, title: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(null);
    try { await apiClient("/api/admin/officers", { method: "POST", body: values }); window.location.reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "新增幹部職位失敗"); } finally { setBusy(false); }
  }
  return <><Button onClick={() => { setError(null); setOpen(true); }}>新增幹部</Button><Modal open={open} onClose={() => !busy && setOpen(false)} title="新增幹部職位"><form onSubmit={submit} className="space-y-4"><Field label="使用者" htmlFor="create-officer-user" required><Select id="create-officer-user" required value={values.user_id} onChange={(event) => setValues((current) => ({ ...current, user_id: event.target.value }))}><option value="">請選擇使用者</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}（{user.email}）</option>)}</Select></Field><Field label="學年度" htmlFor="create-officer-year" required><Select id="create-officer-year" required value={values.academic_year_id} onChange={(event) => setValues((current) => ({ ...current, academic_year_id: event.target.value }))}><option value="">請選擇學年度</option>{years.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度</option>)}</Select></Field><Field label="職位名稱" htmlFor="create-officer-title" required><Input id="create-officer-title" autoFocus required value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} /></Field><FormFeedback error={error} /><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>取消</Button><Button type="submit" isLoading={busy}>新增</Button></div></form></Modal></>;
}
