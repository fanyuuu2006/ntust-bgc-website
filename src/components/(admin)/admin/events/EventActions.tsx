"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiClient } from "@/libs/api/client";

type EventFormValues = {
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  selfCheckInEnabled: boolean;
  check_in_opens_at: string;
  check_in_closes_at: string;
};

const emptyFormValues = (): EventFormValues => ({
  name: "",
  description: "",
  start_time: "",
  end_time: "",
  selfCheckInEnabled: false,
  check_in_opens_at: "",
  check_in_closes_at: "",
});

export function EventActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<EventFormValues>(emptyFormValues);

  const openCreateDialog = () => {
    setValues(emptyFormValues());
    setError(null);
    setOpen(true);
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
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "新增活動失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" onClick={openCreateDialog}>
        新增活動
      </Button>

      <Modal open={open} onClose={closeCreateDialog} title="新增活動">
        <form onSubmit={createEvent} className="space-y-4">
          <Field label="活動名稱" htmlFor="event-name">
            <Input
              id="event-name"
              className="w-full"
              required
              value={values.name}
              disabled={busy}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="活動說明" htmlFor="event-description">
            <Textarea
              id="event-description"
              className="w-full"
              value={values.description}
              disabled={busy}
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
              disabled={busy}
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
                <Field label="簽到開始" htmlFor="event-check-in-opens-at">
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
                <Field label="簽到截止" htmlFor="event-check-in-closes-at">
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
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={closeCreateDialog}>
              取消
            </Button>
            <Button type="submit" isLoading={busy}>
              {busy ? "新增中…" : "新增"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
