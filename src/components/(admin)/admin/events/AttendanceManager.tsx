"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import type { User, UserProfile } from "@/types/database";
import { AttendanceStatusBadge, ATTENDANCE_STATUS_LABEL } from "./AttendanceStatusBadge";

type AttendanceRecord = {
  id: string;
  user_id: string;
  status: "present" | "late" | "absent";
  attended_at: string | null;
  user: User;
  profile: UserProfile | null;
};

export function AttendanceManager({ eventId, records, users }: {
  eventId: string;
  records: AttendanceRecord[];
  users: User[];
}) {
  const [item, setItem] = useState<AttendanceRecord | "new" | null>(null);
  const [removing, setRemoving] = useState<AttendanceRecord | null>(null);
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<AttendanceRecord["status"]>("present");
  const [attendedAt, setAttendedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(value: AttendanceRecord | "new") {
    setItem(value);
    setError(null);
    setUserId(value === "new" ? "" : value.user_id);
    setStatus(value === "new" ? "present" : value.status);
    setAttendedAt(value === "new" ? "" : (value.attended_at?.slice(0, 16) ?? ""));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!item || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(
        item === "new"
          ? `/api/admin/events/${eventId}/attendances`
          : `/api/admin/events/${eventId}/attendances/${item.id}`,
        {
          method: item === "new" ? "POST" : "PATCH",
          body: {
            ...(item === "new" ? { user_id: userId } : {}),
            status,
            attended_at: attendedAt ? new Date(attendedAt).toISOString() : null,
          },
        },
      );
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "儲存簽到紀錄失敗");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await apiClient(`/api/admin/events/${eventId}/attendances/${removing.id}`, { method: "DELETE" });
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "刪除簽到紀錄失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-(--text-muted)">
          已到 {records.filter((record) => record.status === "present").length} 人 · 遲到 {records.filter((record) => record.status === "late").length} 人 · 缺席 {records.filter((record) => record.status === "absent").length} 人
        </p>
        <Button onClick={() => open("new")} className="w-full sm:w-auto">+ 新增簽到</Button>
      </div>
      <FormFeedback error={error} />

      {records.length === 0 ? <EmptyState title="尚無簽到紀錄" description="可新增活動參與者的簽到狀態。" /> : <>
        <div className="grid gap-3 md:hidden">
          {records.map((record) => <Card key={record.id} className="rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="font-semibold">{record.profile?.real_name || record.user.name}</p><p className="mt-1 break-all text-sm text-(--text-muted)">{record.profile?.student_id || record.user.email}</p></div>
              <AttendanceStatusBadge status={record.status} />
            </div>
            <p className="mt-2 text-sm text-(--text-muted)">簽到時間：{record.attended_at ? new Date(record.attended_at).toLocaleString("zh-TW") : "—"}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => open(record)}>編輯</Button><Button variant="danger" size="sm" onClick={() => setRemoving(record)}>刪除</Button></div>
          </Card>)}
        </div>
        <Card className="hidden overflow-x-auto rounded-xl p-0 md:block"><Table><TableHeader><TableRow><TableHead>使用者</TableHead><TableHead>學號</TableHead><TableHead>狀態</TableHead><TableHead>簽到時間</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>{records.map((record) => <TableRow key={record.id}><TableCell>{record.profile?.real_name || record.user.name}</TableCell><TableCell>{record.profile?.student_id || "—"}</TableCell><TableCell><AttendanceStatusBadge status={record.status} /></TableCell><TableCell>{record.attended_at ? new Date(record.attended_at).toLocaleString("zh-TW") : "—"}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => open(record)}>編輯</Button><Button variant="danger" size="sm" onClick={() => setRemoving(record)}>刪除</Button></div></TableCell></TableRow>)}</TableBody></Table></Card>
      </>}

      <Modal open={item !== null} onClose={() => !busy && setItem(null)} title={item === "new" ? "新增簽到" : "編輯簽到紀錄"}>
        <form onSubmit={save} className="space-y-4">
          {item === "new" ? <Field label="使用者" htmlFor="attendance-user" required><Select id="attendance-user" required value={userId} onChange={(event) => setUserId(event.target.value)}><option value="">選擇使用者</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}（{user.email}）</option>)}</Select></Field> : null}
          <Field label="出席狀態" htmlFor="attendance-status"><Select id="attendance-status" value={status} onChange={(event) => setStatus(event.target.value as AttendanceRecord["status"])}>{Object.entries(ATTENDANCE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
          {status !== "absent" ? <Field label="簽到時間" htmlFor="attendance-at"><Input id="attendance-at" type="datetime-local" value={attendedAt} onChange={(event) => setAttendedAt(event.target.value)} /></Field> : null}
          <FormFeedback error={error} />
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setItem(null)} disabled={busy}>取消</Button><Button type="submit" isLoading={busy}>儲存</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={removing !== null} onClose={() => !busy && setRemoving(null)} onConfirm={remove} isSubmitting={busy} title="刪除簽到紀錄？" description="確定要刪除這筆簽到紀錄嗎？" />
    </div>
  );
}
