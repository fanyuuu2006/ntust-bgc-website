"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { apiClient } from "@/libs/api/client";
import type { Event } from "@/types/database";
import { formatAdminDateTime } from "@/utils/date";
import { EventStatusBadge } from "./EventStatusBadge";

type EventFormValues = {
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  selfCheckInEnabled: boolean;
  check_in_opens_at: string;
  check_in_closes_at: string;
};

export function EventRecords({ events, hasQuery = false }: { events: Event[]; hasQuery?: boolean }) {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<{ event: Event; action: "edit" | "delete" } | null>(null);
  const [values, setValues] = useState<EventFormValues>({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
    selfCheckInEnabled: false,
    check_in_opens_at: "",
    check_in_closes_at: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editingEvent = selectedEvent?.action === "edit" ? selectedEvent.event : null;
  const deletingEvent = selectedEvent?.action === "delete" ? selectedEvent.event : null;

  const openEditDialog = (event: Event) => {
    setSelectedEvent({ event, action: "edit" });
    setValues({
      name: event.name,
      description: event.description ?? "",
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time.slice(0, 16),
      selfCheckInEnabled:
        event.check_in_opens_at !== null && event.check_in_closes_at !== null,
      check_in_opens_at: event.check_in_opens_at?.slice(0, 16) ?? "",
      check_in_closes_at: event.check_in_closes_at?.slice(0, 16) ?? "",
    });
    setEditError(null);
  };

  const closeEditDialog = () => {
    if (isSaving) return;

    setSelectedEvent(null);
    setEditError(null);
  };

  const openDeleteDialog = (event: Event) => {
    setSelectedEvent({ event, action: "delete" });
    setDeleteError(null);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;

    setSelectedEvent(null);
    setDeleteError(null);
  };

  const saveEvent = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    if (!editingEvent) return;

    setIsSaving(true);
    setEditError(null);

    try {
      await apiClient(`/api/admin/events/${editingEvent.id}`, {
        method: "PATCH",
        body: {
          name: values.name,
          description: values.description || null,
          start_time: new Date(values.start_time).toISOString(),
          end_time: new Date(values.end_time).toISOString(),
          check_in_opens_at: values.selfCheckInEnabled
            ? new Date(values.check_in_opens_at).toISOString()
            : null,
          check_in_closes_at: values.selfCheckInEnabled
            ? new Date(values.check_in_closes_at).toISOString()
            : null,
        },
      });
      setSelectedEvent(null);
      router.refresh();
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "更新活動失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  const removeEvent = async () => {
    if (!deletingEvent) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient(`/api/admin/events/${deletingEvent.id}`, { method: "DELETE" });
      setSelectedEvent(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "刪除活動失敗，請稍後再試。");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!events.length) {
    return hasQuery ? (
      <QueryEmptyState
        title="找不到符合條件的活動"
        description="請調整搜尋或篩選條件後再試。"
        clearHref="/admin/events"
      />
    ) : (
      <EmptyState title="目前沒有活動" description="可由上方按鈕新增活動。" />
    );
  }

  return (
    <>
      <Card className="hidden overflow-x-auto p-0 lg:block">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>活動</TableHead>
              <TableHead>開始時間</TableHead>
              <TableHead>結束時間</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="min-w-64">
                  <Link className="font-medium hover:underline" href={`/admin/events/${event.id}`}>
                    {event.name}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(event.start_time)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(event.end_time)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <EventStatusBadge event={event} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <EventRowActions event={event} onEdit={openEditDialog} onDelete={openDeleteDialog} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 lg:hidden">
        {events.map((event) => (
          <Card key={event.id} className="w-full min-w-0 max-w-full p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link className="block truncate font-semibold" href={`/admin/events/${event.id}`}>
                  {event.name}
                </Link>
                <p className="text-sm text-(--muted)">
                  {formatAdminDateTime(event.start_time)} 至 {formatAdminDateTime(event.end_time)}
                </p>
              </div>
              <span className="shrink-0">
                <EventStatusBadge event={event} />
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <EventRowActions event={event} onEdit={openEditDialog} onDelete={openDeleteDialog} />
            </div>
          </Card>
        ))}
      </div>

      <Modal open={editingEvent !== null} onClose={closeEditDialog} title="編輯活動">
        <form onSubmit={saveEvent} className="space-y-4">
          <Field label="活動名稱" htmlFor="event-name">
            <Input
              id="event-name"
              className="w-full"
              required
              value={values.name}
              disabled={isSaving}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="活動說明" htmlFor="event-description">
            <Textarea
              id="event-description"
              className="w-full"
              value={values.description}
              disabled={isSaving}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            />
          </Field>
          <Field label="開始時間" htmlFor="event-start-time">
            <Input
              id="event-start-time"
              className="w-full"
              required
              type="datetime-local"
              value={values.start_time}
              disabled={isSaving}
              onChange={(event) => setValues((current) => ({ ...current, start_time: event.target.value }))}
            />
          </Field>
          <Field label="結束時間" htmlFor="event-end-time">
            <Input
              id="event-end-time"
              className="w-full"
              required
              type="datetime-local"
              value={values.end_time}
              disabled={isSaving}
              onChange={(event) => setValues((current) => ({ ...current, end_time: event.target.value }))}
            />
          </Field>
          <div className="rounded-lg border border-(--border-default) p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={values.selfCheckInEnabled}
                disabled={isSaving}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    selfCheckInEnabled: event.target.checked,
                    check_in_opens_at: event.target.checked
                      ? current.check_in_opens_at || current.start_time
                      : "",
                    check_in_closes_at: event.target.checked
                      ? current.check_in_closes_at || current.end_time
                      : "",
                  }))
                }
              />
              開放社員自助簽到
            </label>
            {values.selfCheckInEnabled ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="簽到開始" htmlFor="edit-event-check-in-opens-at">
                  <Input
                    id="edit-event-check-in-opens-at"
                    className="w-full"
                    required
                    type="datetime-local"
                    value={values.check_in_opens_at}
                    disabled={isSaving}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        check_in_opens_at: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="簽到截止" htmlFor="edit-event-check-in-closes-at">
                  <Input
                    id="edit-event-check-in-closes-at"
                    className="w-full"
                    required
                    type="datetime-local"
                    value={values.check_in_closes_at}
                    disabled={isSaving}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        check_in_closes_at: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            ) : null}
          </div>
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
        open={deletingEvent !== null}
        onClose={closeDeleteDialog}
        onConfirm={removeEvent}
        isSubmitting={isDeleting}
        title="刪除活動"
        description={
          deletingEvent
            ? `確定要刪除「${deletingEvent.name}」嗎？${deleteError ? ` ${deleteError}` : ""}`
            : ""
        }
      />
    </>
  );
}

function EventRowActions({
  event,
  onEdit,
  onDelete,
}: {
  event: Event;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <ButtonLink href={`/admin/events/${event.id}`} size="sm" variant="outline">
        簽到管理
      </ButtonLink>
      <Button type="button" size="sm" variant="outline" onClick={() => onEdit(event)}>
        編輯
      </Button>
      <Button type="button" size="sm" variant="danger" onClick={() => onDelete(event)}>
        刪除
      </Button>
    </div>
  );
}
