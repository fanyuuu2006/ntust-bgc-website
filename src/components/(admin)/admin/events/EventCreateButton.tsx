"use client";

import { useState } from "react";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiClient } from "@/libs/api/client";

type Form = { name: string; description: string; start_time: string; end_time: string };
const emptyForm = (): Form => ({ name: "", description: "", start_time: "", end_time: "" });
export function EventCreateButton() {
  const [open, setOpen] = useState(false); const [form, setForm] = useState<Form>(emptyForm); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (busy) return; setBusy(true); setError(null); try { await apiClient("/api/admin/events", { method: "POST", body: { name: form.name, ...(form.description ? { description: form.description } : {}), start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time).toISOString() } }); window.location.reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : "新增活動失敗"); } finally { setBusy(false); } }
  return <><Button onClick={() => { setError(null); setOpen(true); }}>新增活動</Button><Modal open={open} onClose={() => !busy && setOpen(false)} title="新增活動"><form onSubmit={submit} className="space-y-4"><Field label="活動名稱" htmlFor="create-event-name" required><Input id="create-event-name" autoFocus required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field><Field label="活動說明" htmlFor="create-event-description"><Textarea id="create-event-description" rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="開始時間" htmlFor="create-event-start" required><Input id="create-event-start" required type="datetime-local" value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} /></Field><Field label="結束時間" htmlFor="create-event-end" required><Input id="create-event-end" required type="datetime-local" value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} /></Field></div><FormFeedback error={error} /><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>取消</Button><Button type="submit" isLoading={busy}>新增</Button></div></form></Modal></>;
}
