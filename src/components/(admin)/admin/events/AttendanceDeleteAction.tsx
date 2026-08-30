"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import type { AttendanceRecord } from "./AttendanceActions";

export function AttendanceDeleteAction({
  eventId,
  record,
}: {
  eventId: string;
  record: AttendanceRecord;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/admin/events/${eventId}/attendances/${record.id}`, {
        method: "DELETE",
      });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "刪除簽到紀錄失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="danger"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        刪除
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        onConfirm={remove}
        isSubmitting={busy}
        title="刪除簽到紀錄？"
        description={error ?? "此操作無法復原。"}
      />
    </>
  );
}
