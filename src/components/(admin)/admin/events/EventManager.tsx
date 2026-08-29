"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
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

type EventForm = { name: string; description: string; start_time: string; end_time: string };
const emptyForm = (): EventForm => ({ name: "", description: "", start_time: "", end_time: "" });

export function EventManager({ events }: { events: Event[] }) {
  const [item, setItem] = useState<Event | "new" | null>(null);
  const [removeItem, setRemoveItem] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(value: Event | "new") {
    setItem(value);
    setError(null);
    setForm(value === "new" ? emptyForm() : { name: value.name, description: value.description ?? "", start_time: value.start_time.slice(0, 16), end_time: value.end_time.slice(0, 16) });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!item || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(item === "new" ? "/api/admin/events" : `/api/admin/events/${item.id}`, {
        method: item === "new" ? "POST" : "PATCH",
        body: {
          name: form.name,
          ...(item === "new" && !form.description ? {} : { description: form.description || null }),
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
        },
      });
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "儲存活動失敗");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!removeItem) return;
    setBusy(true);
    try {
      await apiClient(`/api/admin/events/${removeItem.id}`, { method: "DELETE" });
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "刪除活動失敗");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-4">
    <div className="flex justify-end"><Button onClick={() => open("new")} className="w-full sm:w-auto">+ 新增活動</Button></div>
    <FormFeedback error={error} />
    {events.length === 0 ? <EmptyState title="尚無活動" description="建立活動後即可管理簽到紀錄。" /> : <>
      <div className="grid gap-3 md:hidden">{events.map((event) => <Card key={event.id} className="rounded-xl p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/admin/events/${event.id}`} className="font-semibold hover:underline">{event.name}</Link><p className="mt-1 text-sm text-(--text-muted)">{formatAdminDateTime(event.start_time)} ～ {formatAdminDateTime(event.end_time)}</p></div><EventStatusBadge event={event} /></div><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => open(event)}>編輯</Button><Button variant="danger" size="sm" onClick={() => setRemoveItem(event)}>刪除</Button></div></Card>)}</div>
      <Card className="hidden overflow-x-auto rounded-xl p-0 md:block"><Table><TableHeader><TableRow><TableHead>活動</TableHead><TableHead>開始時間</TableHead><TableHead>結束時間</TableHead><TableHead>狀態</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>{events.map((event) => <TableRow key={event.id}><TableCell><Link href={`/admin/events/${event.id}`} className="font-medium hover:underline">{event.name}</Link></TableCell><TableCell>{formatAdminDateTime(event.start_time)}</TableCell><TableCell>{formatAdminDateTime(event.end_time)}</TableCell><TableCell><EventStatusBadge event={event} /></TableCell><TableCell><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => open(event)}>編輯</Button><Button variant="danger" size="sm" onClick={() => setRemoveItem(event)}>刪除</Button></div></TableCell></TableRow>)}</TableBody></Table></Card>
    </>}
    <Modal open={item !== null} onClose={() => !busy && setItem(null)} title={item === "new" ? "新增活動" : "編輯活動"}><form onSubmit={save} className="space-y-4"><Field label="活動名稱" htmlFor="event-name" required><Input id="event-name" autoFocus required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field><Field label="活動說明" htmlFor="event-description"><Textarea id="event-description" rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="開始時間" htmlFor="event-start" required><Input id="event-start" required type="datetime-local" value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} /></Field><Field label="結束時間" htmlFor="event-end" required><Input id="event-end" required type="datetime-local" value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} /></Field></div><FormFeedback error={error} /><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setItem(null)}>取消</Button><Button type="submit" isLoading={busy}>儲存</Button></div></form></Modal>
    <ConfirmDialog open={removeItem !== null} onClose={() => !busy && setRemoveItem(null)} onConfirm={remove} isSubmitting={busy} title="刪除活動？" description={removeItem ? `確定要刪除「${removeItem.name}」嗎？此操作無法復原。` : ""} />
  </div>;
}
