"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export type AttendanceRecord = {
  id: string;
  user_id: string;
  status: "present" | "late" | "absent";
  attended_at: string | null;
  user: User;
  profile: UserProfile | null;
};

type AttendanceFormValues = {
  status: AttendanceRecord["status"];
  attended_at: string;
};

export function AttendanceRecords({
  eventId,
  records,
}: {
  eventId: string;
  records: AttendanceRecord[];
}) {
  const router = useRouter();
  const [selectedAttendance, setSelectedAttendance] = useState<
    { record: AttendanceRecord; action: "edit" | "delete" } | null
  >(null);
  const [values, setValues] = useState<AttendanceFormValues>({ status: "present", attended_at: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editingAttendance = selectedAttendance?.action === "edit" ? selectedAttendance.record : null;
  const deletingAttendance = selectedAttendance?.action === "delete" ? selectedAttendance.record : null;

  const openEditDialog = (record: AttendanceRecord) => {
    setSelectedAttendance({ record, action: "edit" });
    setValues({
      status: record.status,
      attended_at: record.attended_at?.slice(0, 16) ?? "",
    });
    setEditError(null);
  };

  const closeEditDialog = () => {
    if (isSaving) return;

    setSelectedAttendance(null);
    setEditError(null);
  };

  const openDeleteDialog = (record: AttendanceRecord) => {
    setSelectedAttendance({ record, action: "delete" });
    setDeleteError(null);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;

    setSelectedAttendance(null);
    setDeleteError(null);
  };

  const saveAttendance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAttendance) return;

    setIsSaving(true);
    setEditError(null);

    try {
      await apiClient(`/api/admin/events/${eventId}/attendances/${editingAttendance.id}`, {
        method: "PATCH",
        body: {
          status: values.status,
          attended_at:
            values.status === "absent"
              ? null
              : values.attended_at
                ? new Date(values.attended_at).toISOString()
                : null,
        },
      });
      setSelectedAttendance(null);
      router.refresh();
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "更新簽到紀錄失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  const removeAttendance = async () => {
    if (!deletingAttendance) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient(`/api/admin/events/${eventId}/attendances/${deletingAttendance.id}`, {
        method: "DELETE",
      });
      setSelectedAttendance(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "刪除簽到紀錄失敗，請稍後再試。");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!records.length) {
    return <EmptyState title="目前沒有簽到紀錄" description="可由上方按鈕手動新增簽到紀錄。" />;
  }

  return (
    <>
      <Card className="hidden overflow-x-auto p-0 lg:block">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>使用者</TableHead>
              <TableHead>學號</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>簽到時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="min-w-40 font-medium">{record.profile?.real_name || record.user.name}</TableCell>
                <TableCell className="min-w-48">{record.profile?.student_id || record.user.email}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <AttendanceStatusBadge status={record.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatAttendanceTime(record.attended_at)}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <AttendanceRowActions record={record} onEdit={openEditDialog} onDelete={openDeleteDialog} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 lg:hidden">
        {records.map((record) => (
          <Card key={record.id} className="w-full min-w-0 max-w-full p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{record.profile?.real_name || record.user.name}</p>
                <p className="truncate text-sm text-(--muted)">{record.profile?.student_id || record.user.email}</p>
              </div>
              <span className="shrink-0">
                <AttendanceStatusBadge status={record.status} />
              </span>
            </div>
            <p className="mt-2 text-sm">簽到時間：{formatAttendanceTime(record.attended_at)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AttendanceRowActions record={record} onEdit={openEditDialog} onDelete={openDeleteDialog} />
            </div>
          </Card>
        ))}
      </div>

      <Modal open={editingAttendance !== null} onClose={closeEditDialog} title="編輯簽到紀錄">
        <form onSubmit={saveAttendance} className="space-y-4">
          <Field label="狀態" htmlFor="attendance-status">
            <Select
              id="attendance-status"
              className="w-full"
              value={values.status}
              disabled={isSaving}
              onChange={(event) =>
                setValues((current) => ({ ...current, status: event.target.value as AttendanceRecord["status"] }))
              }
            >
              {Object.entries(ATTENDANCE_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          {values.status !== "absent" ? (
            <Field label="簽到時間" htmlFor="attendance-time">
              <Input
                id="attendance-time"
                className="w-full"
                type="datetime-local"
                value={values.attended_at}
                disabled={isSaving}
                onChange={(event) => setValues((current) => ({ ...current, attended_at: event.target.value }))}
              />
            </Field>
          ) : null}
          <FormFeedback error={editError} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={isSaving} onClick={closeEditDialog}>
              取消
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isSaving ? "儲存中…" : "儲存"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingAttendance !== null}
        onClose={closeDeleteDialog}
        onConfirm={removeAttendance}
        isSubmitting={isDeleting}
        title="刪除簽到紀錄"
        description={
          deletingAttendance
            ? `確定要刪除這筆簽到紀錄嗎？${deleteError ? ` ${deleteError}` : ""}`
            : ""
        }
      />
    </>
  );
}

function AttendanceRowActions({
  record,
  onEdit,
  onDelete,
}: {
  record: AttendanceRecord;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (record: AttendanceRecord) => void;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => onEdit(record)}>
        編輯
      </Button>
      <Button type="button" size="sm" variant="danger" onClick={() => onDelete(record)}>
        刪除
      </Button>
    </div>
  );
}

function formatAttendanceTime(value: string | null) {
  return value ? new Date(value).toLocaleString("zh-TW") : "未簽到";
}
