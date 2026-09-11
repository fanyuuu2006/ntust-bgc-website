"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { AdminUserPicker } from "@/components/(admin)/admin/users/AdminUserPicker";
import { apiClient } from "@/libs/api/client";
import type { AcademicYear, MembershipStatus } from "@/types/database";

type Props = {
  years: AcademicYear[];
};

export function MembershipCreateButton({
  years,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerResetKey, setPickerResetKey] = useState(0);
  const [values, setValues] = useState({
    user_id: "",
    academic_year_id: years.find((year) => year.is_current)?.id ?? "",
    status: "active" as MembershipStatus,
  });

  function showDialog() {
    setError(null);
    setValues({
      user_id: "",
      academic_year_id: years.find((year) => year.is_current)?.id ?? "",
      status: "active",
    });
    setPickerResetKey((current) => current + 1);
    setOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient("/api/admin/memberships", { method: "POST", body: values });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "新增社員資格失敗。" );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={showDialog}>新增社員資格</Button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="新增社員資格">
        <form className="space-y-4" onSubmit={submit}>
          <Field label="使用者" htmlFor="membership-user" required>
            <AdminUserPicker
              key={pickerResetKey}
              id="membership-user"
              disabled={busy}
              onChange={(user) =>
                setValues((current) => ({
                  ...current,
                  user_id: user?.id ?? "",
                }))
              }
            />
          </Field>
          <Field label="學年度" htmlFor="membership-year" required>
            <Select id="membership-year" required value={values.academic_year_id} disabled={busy} onChange={(event) => setValues((current) => ({ ...current, academic_year_id: event.target.value }))}>
              {years.map((year) => <option key={year.id} value={year.id}>{year.year} 學年度{year.is_current ? "（目前）" : ""}</option>)}
            </Select>
          </Field>
          <p className="text-sm text-(--muted)">社員類型會依該使用者的幹部職位紀錄自動判定。</p>
          <Field label="狀態" htmlFor="membership-status" required>
            <Select id="membership-status" required value={values.status} disabled={busy} onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as MembershipStatus }))}>
              <option value="pending">待審核</option><option value="active">有效</option><option value="expired">已過期</option><option value="suspended">已停權</option><option value="cancelled">已取消</option>
            </Select>
          </Field>
          <FormFeedback error={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>取消</Button>
            <Button type="submit" isLoading={busy} disabled={!values.user_id}>{busy ? "新增中…" : "新增"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
