"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { RichContentPreview } from "@/components/RichContentPreview";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import dynamic from "next/dynamic";
import { editableRichContent } from "@/libs/rich-content/content";
import { apiClient } from "@/libs/api/client";
import { parseTaipeiDateTimeLocal } from "@/utils/date";
import { useToast } from "@/contexts/ToastContext";
import { DEFAULT_CALENDAR_COLOR } from "@/utils/calendar-color";
import { EventColorPicker } from "./EventColorPicker";
import { EventPreviewModal } from "./EventPreviewModal";
import { Eye } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

// Editor runtime 僅供管理端編輯，不帶入伺服器渲染的閱讀頁面。
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor").then((module) => module.RichTextEditor), { ssr: false });

type EventFormValues = {
  name: string;
  description: unknown;
  start_time: string;
  end_time: string;
  selfCheckInEnabled: boolean;
  check_in_opens_at: string;
  check_in_closes_at: string;
  calendar_color: string;
};
type EventTemplateOption = { id: string; name: string; description: string | null; description_format: "plain_text" | "rich_text_v1"; rich_description: unknown; calendar_color: string | null };

const emptyFormValues = (): EventFormValues => ({
  name: "",
  description: editableRichContent(),
  start_time: "",
  end_time: "",
  selfCheckInEnabled: false,
  check_in_opens_at: "",
  check_in_closes_at: "",
  calendar_color: DEFAULT_CALENDAR_COLOR,
});

export function EventActions({ templates: initialTemplates = [], initialTemplateId }: { templates?: EventTemplateOption[]; initialTemplateId?: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<EventFormValues>(emptyFormValues);
  const [submitMode, setSubmitMode] = useState<"published" | "draft">("published");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templates, setTemplates] = useState<EventTemplateOption[]>([]);

  const openCreateDialog = () => {
    const selected = initialTemplates.find((template) => template.id === initialTemplateId);
    setValues(selected ? { ...emptyFormValues(), description: selected.rich_description ?? selected.description ?? "", calendar_color: selected.calendar_color ?? DEFAULT_CALENDAR_COLOR } : emptyFormValues());
    setSubmitMode("published");
    setError(null);
    setOpen(true);
    setTemplates(initialTemplates);
  };

  const closeCreateDialog = () => {
    if (busy) return;

    setError(null);
    setOpen(false);
  };

  const createEvent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await apiClient("/api/admin/events", {
        method: "POST",
        body: {
          name: values.name,
          description_format: "rich_text_v1",
          rich_description: values.description,
          start_time: parseTaipeiDateTimeLocal(values.start_time),
          end_time: parseTaipeiDateTimeLocal(values.end_time),
          publication_status: submitMode,
          calendar_color: values.calendar_color,
          check_in_opens_at: values.selfCheckInEnabled
            ? parseTaipeiDateTimeLocal(values.check_in_opens_at)
            : null,
          check_in_closes_at: values.selfCheckInEnabled
            ? parseTaipeiDateTimeLocal(values.check_in_closes_at)
            : null,
        },
      });
      setOpen(false);
      showToast("success", "活動已新增");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "新增活動失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={openCreateDialog}>新增活動</Button>
        <ButtonLink href="/admin/events/templates" variant="outline">活動範本</ButtonLink>
      </div>

      <Modal size="lg" open={open} onClose={closeCreateDialog} title="新增活動" headerActions={<Button type="button" variant="outline" size="sm" className="shrink-0" aria-label="活動預覽" disabled={busy} onClick={() => setPreviewOpen(true)}><Eye aria-hidden="true" className="size-4" />活動預覽</Button>}>
        <form onSubmit={createEvent} className="space-y-4">
          {templates.length ? <Field label="套用活動範本" htmlFor="event-template"><select id="event-template" className="w-full rounded-lg border border-(--border-default) bg-(--surface-default) p-2" defaultValue="" onChange={(event) => { const template = templates.find((item) => item.id === event.target.value); if (template) setValues((current) => ({ ...current, description: template.rich_description ?? template.description ?? "", calendar_color: template.calendar_color ?? current.calendar_color })); }} disabled={busy}><option value="">建立空白活動</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field> : null}
          <Field label="活動名稱" htmlFor="event-name" required>
            <Input
              id="event-name"
              className="w-full"
              required
              value={values.name}
              disabled={busy}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="活動說明" htmlFor="event-description" action={<RichContentPreview value={values.description} title={values.name} label="活動說明預覽" />}>
            {open ? <RichTextEditor id="event-description" label="活動說明" initialContent={editableRichContent()} onChange={(description) => setValues((current) => ({ ...current, description }))} disabled={busy} /> : null}
            <p className="text-xs text-(--text-muted)">可留空；格式化內容最多 20,000 字元。</p>
          </Field>
          <Field label="行事曆顏色" htmlFor="event-calendar-color">
            <EventColorPicker id="event-calendar-color" value={values.calendar_color} onChange={(calendar_color) => setValues((current) => ({ ...current, calendar_color: calendar_color ?? DEFAULT_CALENDAR_COLOR }))} disabled={busy} />
          </Field>
          <Field label="開始時間" htmlFor="event-start-time" required>
            <Input
              id="event-start-time"
              className="w-full"
              required
              type="datetime-local"
              value={values.start_time}
              disabled={busy}
              onChange={(event) => setValues((current) => ({ ...current, start_time: event.target.value }))}
            />
          </Field>
          <Field label="結束時間" htmlFor="event-end-time" required>
            <Input
              id="event-end-time"
              className="w-full"
              required
              type="datetime-local"
              value={values.end_time}
              disabled={busy}
              onChange={(event) => setValues((current) => ({ ...current, end_time: event.target.value }))}
            />
          </Field>
          <div className="rounded-lg border border-(--border-default) p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={values.selfCheckInEnabled}
                disabled={busy}
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
                <Field label="簽到開始" htmlFor="event-check-in-opens-at" required>
                  <Input
                    id="event-check-in-opens-at"
                    className="w-full"
                    required
                    type="datetime-local"
                    value={values.check_in_opens_at}
                    disabled={busy}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        check_in_opens_at: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="簽到截止" htmlFor="event-check-in-closes-at" required>
                  <Input
                    id="event-check-in-closes-at"
                    className="w-full"
                    required
                    type="datetime-local"
                    value={values.check_in_closes_at}
                    disabled={busy}
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
          <FormFeedback error={error} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={closeCreateDialog}>
              取消
            </Button>
            <Button type="submit" variant="outline" disabled={busy} onClick={() => setSubmitMode("draft")} isLoading={busy && submitMode === "draft"}>
              儲存草稿
            </Button>
            <Button type="submit" disabled={busy} onClick={() => setSubmitMode("published")} isLoading={busy && submitMode === "published"}>
              建立並發布
            </Button>
          </div>
        </form>
      </Modal>
      <EventPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} name={values.name} start={values.start_time} end={values.end_time} color={values.calendar_color} description={values.description} />
    </>
  );
}
