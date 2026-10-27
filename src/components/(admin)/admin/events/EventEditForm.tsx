"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { RichContentPreview } from "@/components/RichContentPreview";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FormFeedback } from "@/components/FormFeedback";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { apiClient } from "@/libs/api/client";
import { editableRichContent, type RichContent } from "@/libs/rich-content/content";
import { storedDescription } from "@/libs/rich-content/description";
import { parseTaipeiDateTimeLocal, formatTaipeiDateTimeLocal } from "@/utils/date";
import { useToast } from "@/contexts/ToastContext";
import type { Event } from "@/types/database";
import { DEFAULT_CALENDAR_COLOR } from "@/utils/calendar-color";
import { EventColorPicker } from "./EventColorPicker";
import { EventPreviewModal } from "./EventPreviewModal";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor").then((module) => module.RichTextEditor), { ssr: false });

export function EventEditForm({ event }: { event: Event }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicationStatus, setPublicationStatus] = useState(event.publication_status);
  const [cancelled, setCancelled] = useState(Boolean(event.cancelled_at));
  const [confirmCancel, setConfirmCancel] = useState<"cancel" | "restore" | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => {
    const openPreview = () => setPreviewOpen(true);
    window.addEventListener("event-edit-preview", openPreview);
    return () => window.removeEventListener("event-edit-preview", openPreview);
  }, []);
  const [values, setValues] = useState({
    name: event.name,
    description: editableRichContent(storedDescription(event)) as RichContent,
    start_time: formatTaipeiDateTimeLocal(new Date(event.start_time)),
    end_time: formatTaipeiDateTimeLocal(new Date(event.end_time)),
    selfCheckInEnabled: event.check_in_opens_at !== null && event.check_in_closes_at !== null,
    check_in_opens_at: event.check_in_opens_at ? formatTaipeiDateTimeLocal(new Date(event.check_in_opens_at)) : "",
    check_in_closes_at: event.check_in_closes_at ? formatTaipeiDateTimeLocal(new Date(event.check_in_closes_at)) : "",
    calendar_color: event.calendar_color ?? DEFAULT_CALENDAR_COLOR,
  });

  const updateValues = (patch: Partial<typeof values>) => setValues((current) => ({ ...current, ...patch }));
  const save = async (formEvent: React.FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setBusy(true); setError(null);
    try {
      await apiClient(`/api/admin/events/${event.id}`, { method: "PATCH", body: {
        name: values.name, description_format: "rich_text_v1", rich_description: values.description,
        start_time: parseTaipeiDateTimeLocal(values.start_time), end_time: parseTaipeiDateTimeLocal(values.end_time),
        check_in_opens_at: values.selfCheckInEnabled ? parseTaipeiDateTimeLocal(values.check_in_opens_at) : null,
        check_in_closes_at: values.selfCheckInEnabled ? parseTaipeiDateTimeLocal(values.check_in_closes_at) : null,
        calendar_color: values.calendar_color,
      }});
      showToast("success", "活動已更新"); router.push(`/admin/events/${event.id}`); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "更新活動失敗，請稍後再試。"); }
    finally { setBusy(false); }
  };
  const updatePublication = async (status: "draft" | "published") => {
    setBusy(true); setError(null);
    try { await apiClient(`/api/admin/events/${event.id}`, { method: "PATCH", body: { publication_status: status } }); setPublicationStatus(status); setConfirmUnpublish(false); showToast("success", status === "published" ? "活動已發布" : "活動已取消發布"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "發布狀態更新失敗"); }
    finally { setBusy(false); }
  };
  const updateCancellation = async () => {
    if (!confirmCancel) return;
    const action = confirmCancel; setBusy(true); setError(null);
    try { await apiClient(`/api/admin/events/${event.id}`, { method: "PATCH", body: { action } }); setCancelled(action === "cancel"); setConfirmCancel(null); showToast("success", action === "cancel" ? "活動已取消" : "活動已恢復"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "活動狀態更新失敗"); }
    finally { setBusy(false); }
  };

  return <>
    <form onSubmit={save} className="space-y-5">
      <Field label="活動名稱" htmlFor="event-edit-name" required><Input id="event-edit-name" className="w-full" required value={values.name} disabled={busy} onChange={(e) => updateValues({ name: e.target.value })} /></Field>
      <Field label="活動說明" htmlFor="event-edit-description" action={<RichContentPreview value={values.description} title={values.name} label="活動說明預覽" />}><RichTextEditor id="event-edit-description" label="活動說明" initialContent={values.description} onChange={(description) => updateValues({ description: description as RichContent })} disabled={busy} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="開始時間" htmlFor="event-edit-start" required><Input id="event-edit-start" type="datetime-local" className="w-full" required value={values.start_time} disabled={busy} onChange={(e) => updateValues({ start_time: e.target.value })} /></Field><Field label="結束時間" htmlFor="event-edit-end" required><Input id="event-edit-end" type="datetime-local" className="w-full" required value={values.end_time} disabled={busy} onChange={(e) => updateValues({ end_time: e.target.value })} /></Field></div>
      <Field label="行事曆顏色" htmlFor="event-edit-calendar-color"><EventColorPicker id="event-edit-calendar-color" value={values.calendar_color} onChange={(calendar_color) => updateValues({ calendar_color: calendar_color ?? DEFAULT_CALENDAR_COLOR })} disabled={busy} /></Field>
      <div className="rounded-lg border border-(--border-default) p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={values.selfCheckInEnabled} disabled={busy} onChange={(e) => updateValues({ selfCheckInEnabled: e.target.checked, check_in_opens_at: e.target.checked ? values.check_in_opens_at || values.start_time : "", check_in_closes_at: e.target.checked ? values.check_in_closes_at || values.end_time : "" })} />開放社員自助簽到</label>{values.selfCheckInEnabled ? <div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="簽到開始" htmlFor="event-edit-check-in-open" required><Input id="event-edit-check-in-open" type="datetime-local" className="w-full" required value={values.check_in_opens_at} disabled={busy} onChange={(e) => updateValues({ check_in_opens_at: e.target.value })} /></Field><Field label="簽到截止" htmlFor="event-edit-check-in-close" required><Input id="event-edit-check-in-close" type="datetime-local" className="w-full" required value={values.check_in_closes_at} disabled={busy} onChange={(e) => updateValues({ check_in_closes_at: e.target.value })} /></Field></div> : null}</div>
      <section className="space-y-3 rounded-lg border border-(--border-default) p-4" aria-labelledby="event-status-title"><h2 id="event-status-title" className="text-sm font-semibold">發布與活動狀態</h2><div className="divide-y divide-(--border-default)"><div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"><div className="flex min-w-0 items-center gap-2"><span className="text-sm text-(--text-secondary)">發布狀態</span><Badge tone={publicationStatus === "published" ? "success" : "warning"}>{publicationStatus === "published" ? "已發布" : "草稿"}</Badge></div>{publicationStatus === "published" ? <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setConfirmUnpublish(true)}>取消發布</Button> : <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => updatePublication("published")}>發布活動</Button>}</div><div className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-0"><div className="flex min-w-0 items-center gap-2"><span className="text-sm text-(--text-secondary)">活動狀態</span><Badge tone={cancelled ? "danger" : "neutral"}>{cancelled ? "已取消" : "正常"}</Badge></div><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setConfirmCancel(cancelled ? "restore" : "cancel")}>{cancelled ? "恢復活動" : "取消活動"}</Button></div></div></section>
      <FormFeedback error={error} /><div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end"><Button type="button" variant="outline" disabled={busy} onClick={() => router.push(`/admin/events/${event.id}`)}>取消</Button><Button type="submit" isLoading={busy}>儲存變更</Button></div>
    </form>
    <ConfirmDialog open={confirmCancel !== null} onClose={() => !busy && setConfirmCancel(null)} onConfirm={updateCancellation} isSubmitting={busy} title={confirmCancel === "cancel" ? "取消活動？" : "恢復活動？"} confirmLabel={confirmCancel === "cancel" ? "確認取消" : "確認恢復"} confirmVariant={confirmCancel === "cancel" ? "danger" : "primary"} description={confirmCancel === "cancel" ? "活動不會被刪除，既有簽到紀錄會保留；取消後，一般使用者無法再自助簽到。" : "恢復後將保留原本的發布狀態，並依既有規則判斷是否允許自助簽到。"} />
    <ConfirmDialog open={confirmUnpublish} onClose={() => !busy && setConfirmUnpublish(false)} onConfirm={() => updatePublication("draft")} isSubmitting={busy} title="取消發布？" confirmLabel="確認取消發布" confirmVariant="primary" description="取消發布後，活動將不再公開顯示。" />
    <EventPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} name={values.name} start={values.start_time} end={values.end_time} color={values.calendar_color} description={values.description} />
  </>;
}
