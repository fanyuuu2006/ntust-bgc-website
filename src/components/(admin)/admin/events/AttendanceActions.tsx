"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { AdminUserPicker } from "@/components/(admin)/admin/users/AdminUserPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import type { AdminUserPickerItem } from "@/services/users/users.types";
import { parseTaipeiDateTimeLocal } from "@/utils/date";
import { ATTENDANCE_STATUS_LABEL } from "./AttendanceStatusBadge";
import type { AttendanceRecord } from "./AttendanceRecords";

export function AttendanceActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserPickerItem | null>(null);
  const [pickerResetKey, setPickerResetKey] = useState(0);
  const [status, setStatus] = useState<AttendanceRecord["status"]>("present");
  const [attendedAt, setAttendedAt] = useState("");

  const openCreateDialog = () => {
    setError(null);
    setSelectedUser(null);
    setStatus("present");
    setAttendedAt("");
    setPickerResetKey((current) => current + 1);
    setOpen(true);
  };

  const closeCreateDialog = () => {
    if (busy) return;
    setError(null);
    setOpen(false);
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
          attended_at:
            status === "absent"
              ? null
              : attendedAt
                ? parseTaipeiDateTimeLocal(attendedAt)
                : null,
        },
      });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "新增簽到紀錄失敗，請稍後再試。",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" onClick={openCreateDialog}>
        新增簽到
      </Button>

      <Modal open={open} onClose={closeCreateDialog} title="新增簽到紀錄">
        <form onSubmit={createAttendance} className="space-y-4">
          <Field label="使用者" htmlFor="attendance-user-search" required>
            <AdminUserPicker
              key={pickerResetKey}
              id="attendance-user-search"
              disabled={busy}
              onChange={setSelectedUser}
            />
          </Field>

          <Field label="狀態" htmlFor="attendance-status">
            <Select
              id="attendance-status"
              className="w-full"
              value={status}
              disabled={busy}
              onChange={(event) =>
                setStatus(event.target.value as AttendanceRecord["status"])
              }
            >
              {Object.entries(ATTENDANCE_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {status !== "absent" ? (
            <Field label="簽到時間" htmlFor="attendance-time">
              <Input
                id="attendance-time"
                className="w-full"
                type="datetime-local"
                value={attendedAt}
                disabled={busy}
                onChange={(event) => setAttendedAt(event.target.value)}
              />
            </Field>
          ) : null}

          <FormFeedback error={error} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={closeCreateDialog}
            >
              取消
            </Button>
            <Button type="submit" isLoading={busy} disabled={!selectedUser}>
              {busy ? "新增中…" : "新增簽到"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
