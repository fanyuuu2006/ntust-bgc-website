"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiClient } from "@/libs/api/client";
import type { Event } from "@/types/database";
export function EventActions({ event }: { event?: Event }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [remove, setRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState({
    name: event?.name ?? "",
    description: event?.description ?? "",
    start_time: event?.start_time.slice(0, 16) ?? "",
    end_time: event?.end_time.slice(0, 16) ?? "",
  });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiClient(
        event ? `/api/admin/events/${event.id}` : "/api/admin/events",
        {
          method: event ? "PATCH" : "POST",
          body: {
            name: v.name,
            description: v.description || null,
            start_time: new Date(v.start_time).toISOString(),
            end_time: new Date(v.end_time).toISOString(),
          },
        },
      );
      setOpen(false);
      router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "儲存活動失敗。 ");
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!event) return;
    setBusy(true);
    try {
      await apiClient(`/api/admin/events/${event.id}`, { method: "DELETE" });
      setRemove(false);
      router.refresh();
    } catch (x) {
      setError(x instanceof Error ? x.message : "刪除活動失敗。 ");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={event ? "outline" : "primary"}
        onClick={() => setOpen(true)}
      >
        {event ? "編輯" : "新增活動"}
      </Button>
      {event && (
        <Button type="button" size="sm" variant="danger" onClick={() => setRemove(true)}>
          刪除
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={event ? "編輯活動" : "新增活動"}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="名稱" htmlFor="event-name">
            <Input
              id="event-name"
              className="w-full"
              required
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
            />
          </Field>
          <Field label="說明" htmlFor="event-description">
            <Textarea
              id="event-description"
              className="w-full"
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
            />
          </Field>
          <Field label="開始時間" htmlFor="event-start-time">
            <Input
              id="event-start-time"
              className="w-full"
              required
              type="datetime-local"
              value={v.start_time}
              onChange={(e) => setV({ ...v, start_time: e.target.value })}
            />
          </Field>
          <Field label="結束時間" htmlFor="event-end-time">
            <Input
              id="event-end-time"
              className="w-full"
              required
              type="datetime-local"
              value={v.end_time}
              onChange={(e) => setV({ ...v, end_time: e.target.value })}
            />
          </Field>
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
              {event ? (busy ? "儲存中…" : "儲存") : (busy ? "新增中…" : "新增")}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={remove}
        onClose={() => !busy && setRemove(false)}
        onConfirm={del}
        isSubmitting={busy}
        title="刪除活動？"
        description={event ? `確定要刪除「${event.name}」嗎？` : ""}
      />
    </>
  );
}
