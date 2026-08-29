"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import type { AdminMembership } from "@/services/memberships/memberships.types";
import type { AcademicYear, MembershipStatus, MembershipType } from "@/types/database";

const statusLabels: Record<MembershipStatus, string> = {
  pending: "待審核", active: "有效", expired: "已過期", suspended: "已停權", cancelled: "已取消",
};

export function MembershipEditButton({ membership, years }: { membership: AdminMembership; years: AcademicYear[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState({ academic_year_id: membership.academic_year_id, type: membership.type, status: membership.status, joined_at: membership.joined_at?.slice(0, 16) ?? "" });
  const closeDialog = () => { if (!busy) { setError(null); setOpen(false); } };
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await apiClient(`/api/admin/memberships/${membership.id}`, { method: "PATCH", body: { ...values, joined_at: values.joined_at ? new Date(values.joined_at).toISOString() : null } });
      setOpen(false); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "儲存社員資格失敗。"); }
    finally { setBusy(false); }
  }
  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => { setError(null); setOpen(true); }}>編輯</Button>
    <Modal open={open} onClose={closeDialog} title="編輯社員資格">
      <form onSubmit={save} className="space-y-4">
        <Field label="學年度" htmlFor={`membership-year-${membership.id}`}><Select id={`membership-year-${membership.id}`} className="w-full" value={values.academic_year_id} disabled={busy} onChange={(event) => setValues({ ...values, academic_year_id: event.target.value })}>{years.map((year) => <option key={year.id} value={year.id}>{year.year}</option>)}</Select></Field>
        <Field label="類型" htmlFor={`membership-type-${membership.id}`}><Select id={`membership-type-${membership.id}`} className="w-full" value={values.type} disabled={busy} onChange={(event) => setValues({ ...values, type: event.target.value as MembershipType })}><option value="annual">年度社員</option><option value="lifetime">永久社員</option></Select></Field>
        <Field label="狀態" htmlFor={`membership-status-${membership.id}`}><Select id={`membership-status-${membership.id}`} className="w-full" value={values.status} disabled={busy} onChange={(event) => setValues({ ...values, status: event.target.value as MembershipStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
        <Field label="加入時間" htmlFor={`membership-joined-at-${membership.id}`}><Input id={`membership-joined-at-${membership.id}`} className="w-full" type="datetime-local" value={values.joined_at} disabled={busy} onChange={(event) => setValues({ ...values, joined_at: event.target.value })} /></Field>
        <FormFeedback error={error} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={busy} onClick={closeDialog}>取消</Button><Button type="submit" isLoading={busy}>{busy ? "儲存中…" : "儲存"}</Button></div>
      </form>
    </Modal>
  </>;
}
