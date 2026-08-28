"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { apiClient } from "@/libs/api/client";
import type { UserProfile } from "@/types/database";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { FormFeedback } from "@/components/FormFeedback";

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
    <Button type="button" onClick={() => { setValues(valuesFromProfile(profile)); setError(null); setOpen(true); }} className="rounded-lg">編輯基本資料</Button>
    <Modal open={open} onClose={() => { if (!busy) setOpen(false); }} title="編輯使用者基本資料">
      <form onSubmit={submit} className="space-y-4">
        <FormFeedback error={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <ProfileField label="真實姓名" value={values.real_name} onChange={(value) => update("real_name", value)} required />
          <ProfileField label="聯絡電話" value={values.phone} onChange={(value) => update("phone", value)} required />
          <ProfileField label="學號" value={values.student_id} onChange={(value) => update("student_id", value)} />
          <ProfileField label="學校／學院" value={values.school} onChange={(value) => update("school", value)} />
          <ProfileField label="系所" value={values.department} onChange={(value) => update("department", value)} />
          <ProfileField label="年級" value={values.grade} onChange={(value) => update("grade", value)} />
        </div>
        <div className="flex justify-end gap-2"><Button type="button" disabled={busy} onClick={() => setOpen(false)} variant="outline" className="rounded-lg">取消</Button><Button disabled={busy} isLoading={busy} className="rounded-lg">{busy ? "儲存中…" : "儲存"}</Button></div>
      </form>
    </Modal>
  </>;
}

function ProfileField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  const id = `profile-${label}`;
  return <Field label={label} htmlFor={id} required={required}><Input id={id} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}
