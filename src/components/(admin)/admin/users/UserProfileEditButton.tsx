"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { apiClient } from "@/libs/api/client";
import type { UserProfile } from "@/types/database";

type Values = {
  real_name: string;
  phone: string;
  student_id: string;
  school: string;
  department: string;
  grade: string;
};

function valuesFromProfile(profile: UserProfile | null): Values {
  return {
    real_name: profile?.real_name ?? "",
    phone: profile?.phone ?? "",
    student_id: profile?.student_id ?? "",
    school: profile?.school ?? "",
    department: profile?.department ?? "",
    grade: profile?.grade ?? "",
  };
}

export function UserProfileEditButton({
  userId,
  profile,
}: {
  userId: string;
  profile: UserProfile | null;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>(() => valuesFromProfile(profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof Values, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/admin/users/${userId}/profile`, {
        method: "PATCH",
        body: values,
      });
      setOpen(false);
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "更新使用者資料失敗");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" onClick={() => { setValues(valuesFromProfile(profile)); setError(null); setOpen(true); }} className="btn primary rounded-lg px-4 py-2 text-sm">編輯基本資料</button>
    <Modal open={open} onClose={() => { if (!busy) setOpen(false); }} title="編輯使用者基本資料">
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="真實姓名" value={values.real_name} onChange={(value) => update("real_name", value)} required />
          <Field label="聯絡電話" value={values.phone} onChange={(value) => update("phone", value)} required />
          <Field label="學號" value={values.student_id} onChange={(value) => update("student_id", value)} />
          <Field label="學校／學院" value={values.school} onChange={(value) => update("school", value)} />
          <Field label="系所" value={values.department} onChange={(value) => update("department", value)} />
          <Field label="年級" value={values.grade} onChange={(value) => update("grade", value)} />
        </div>
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="btn outline rounded-lg px-4 py-2 text-sm">取消</button><button disabled={busy} className="btn primary rounded-lg px-4 py-2 text-sm">{busy ? "儲存中…" : "儲存"}</button></div>
      </form>
    </Modal>
  </>;
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="block text-sm font-medium">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-(--border) px-3 py-2.5 font-normal" /></label>;
}
