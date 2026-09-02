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
import type { User, UserProfile } from "@/types/database";
import { parseTaipeiDateTimeLocal } from "@/utils/date";
import { ATTENDANCE_STATUS_LABEL } from "./AttendanceStatusBadge";
import type { AttendanceRecord } from "./AttendanceRecords";

type AttendanceUser = User & { profile: UserProfile | null };

export function AttendanceActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<AttendanceUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AttendanceUser | null>(null);
  const [status, setStatus] = useState<AttendanceRecord["status"]>("present");
  const [attendedAt, setAttendedAt] = useState("");

  const openCreateDialog = () => {
    setError(null);
    setOpen(true);
  };

  const closeCreateDialog = () => {
    if (busy || searching) return;
    setError(null);
    setOpen(false);
  };

  const searchUsers = async () => {
    const keyword = search.trim();
    if (!keyword) {
      setCandidates([]);
      setSelectedUser(null);
      return;
    }

    setSearching(true);
    setError(null);
    try {
      const response = await apiClient<{ data: AttendanceUser[] }>(
        `/api/admin/events/${eventId}/attendances/users?search=${encodeURIComponent(keyword)}`,
      );
      setCandidates(response.data);
      setSelectedUser(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "搜尋使用者失敗，請稍後再試。");
    } finally {
      setSearching(false);
    }
  };

  const createAttendance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) {
      setError("請先搜尋並選擇使用者");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/admin/events/${eventId}/attendances`, {
        method: "POST",
        body: {
          user_id: selectedUser.id,
          status,
          attended_at: status === "absent" ? null : attendedAt ? parseTaipeiDateTimeLocal(attendedAt) : null,
        },
      });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "新增簽到紀錄失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" onClick={openCreateDialog}>新增簽到</Button>

      <Modal open={open} onClose={closeCreateDialog} title="新增簽到紀錄">
        <form onSubmit={createAttendance} className="space-y-4">
          <Field label="搜尋使用者" htmlFor="attendance-user-search">
            <div className="flex gap-2">
              <Input id="attendance-user-search" className="min-w-0 flex-1" value={search} disabled={busy || searching} placeholder="使用者名稱、姓名、Email 或學號" onChange={(event) => setSearch(event.target.value)} />
              <Button type="button" variant="outline" isLoading={searching} disabled={busy} onClick={searchUsers}>搜尋</Button>
            </div>
          </Field>

          {selectedUser ? (
            <div className="rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3 text-sm">
              <p className="font-medium">使用者名稱：{selectedUser.name}</p>
              <p>真實姓名：{selectedUser.profile?.real_name || "尚未填寫"}</p>
              <p className="break-all text-(--muted)">{selectedUser.email}</p>
            </div>
          ) : null}

          {candidates.length > 0 ? (
            <div className="max-h-52 space-y-2 overflow-y-auto" aria-label="搜尋結果">
              {candidates.map((user) => (
                <button key={user.id} type="button" disabled={busy} onClick={() => setSelectedUser(user)} className="w-full rounded-lg border border-(--border-default) p-3 text-left text-sm transition-colors hover:bg-(--surface-subtle) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">
                  <span className="block font-medium">使用者名稱：{user.name}</span>
                  <span className="block">真實姓名：{user.profile?.real_name || "尚未填寫"}</span>
                  <span className="block break-all text-(--muted)">{user.email}</span>
                  {user.profile?.student_id ? <span className="block text-(--muted)">學號：{user.profile.student_id}</span> : null}
                </button>
              ))}
            </div>
          ) : search.trim() && !searching ? <p className="text-sm text-(--muted)">找不到符合條件的使用者</p> : null}

          <Field label="狀態" htmlFor="attendance-status">
            <Select id="attendance-status" className="w-full" value={status} disabled={busy} onChange={(event) => setStatus(event.target.value as AttendanceRecord["status"])}>
              {Object.entries(ATTENDANCE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          {status !== "absent" ? <Field label="簽到時間" htmlFor="attendance-time"><Input id="attendance-time" className="w-full" type="datetime-local" value={attendedAt} disabled={busy} onChange={(event) => setAttendedAt(event.target.value)} /></Field> : null}
          <FormFeedback error={error} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy || searching} onClick={closeCreateDialog}>取消</Button>
            <Button type="submit" isLoading={busy} disabled={!selectedUser || searching}>{busy ? "新增中…" : "新增簽到"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
