"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import type { User, UserProfile } from "@/types/database";
import { ATTENDANCE_STATUS_LABEL } from "./AttendanceStatusBadge";
export type AttendanceRecord = {
  id: string;
  user_id: string;
  status: "present" | "late" | "absent";
  attended_at: string | null;
  user: User;
  profile: UserProfile | null;
};
export function AttendanceActions({
  eventId,
  users,
  record,
}: {
  eventId: string;
  users: User[];
  record?: AttendanceRecord;
}) {
  const r = useRouter(),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [user, setUser] = useState(record?.user_id ?? ""),
    [status, setStatus] = useState<AttendanceRecord["status"]>(
      record?.status ?? "present",
    ),
    [at, setAt] = useState(record?.attended_at?.slice(0, 16) ?? "");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient(
        record
          ? `/api/admin/events/${eventId}/attendances/${record.id}`
          : `/api/admin/events/${eventId}/attendances`,
        {
          method: record ? "PATCH" : "POST",
          body: {
            ...(record ? {} : { user_id: user }),
            status,
            attended_at:
              status === "absent"
                ? null
                : at
                  ? new Date(at).toISOString()
                  : null,
          },
        },
      );
      setOpen(false);
      r.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "儲存簽到紀錄失敗。 ");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={record ? "outline" : "primary"}
        onClick={() => setOpen(true)}
      >
        {record ? "編輯" : "新增簽到"}
      </Button>
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={record ? "編輯簽到紀錄" : "新增簽到紀錄"}
      >
        <form onSubmit={save} className="space-y-4">
          {!record && (
            <Field label="使用者" htmlFor="attendance-user">
              <Select
                id="attendance-user"
                className="w-full"
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
              >
                <option value="">請選擇使用者</option>
                {users.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}（{x.email}）
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="狀態" htmlFor="attendance-status">
            <Select
              id="attendance-status"
              className="w-full"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as AttendanceRecord["status"])
              }
            >
              {Object.entries(ATTENDANCE_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          {status !== "absent" && (
            <Field label="簽到時間" htmlFor="attendance-time">
              <Input
                id="attendance-time"
                className="w-full"
                type="datetime-local"
                value={at}
                onChange={(e) => setAt(e.target.value)}
              />
            </Field>
          )}
          <FormFeedback error={error} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" isLoading={busy}>
              {record ? (busy ? "儲存中…" : "儲存") : (busy ? "新增中…" : "新增")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
