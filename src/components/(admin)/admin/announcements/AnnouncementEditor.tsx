"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiClient } from "@/libs/api/client";
import {
  buildAnnouncementSubmitPayload,
  type AnnouncementSubmitIntent,
} from "./announcementEditor.utils";

type EditableAnnouncement = {
  id: number;
  title: string;
  content: string;
  is_published: boolean;
};

export function AnnouncementEditor({ announcement }: { announcement?: EditableAnnouncement }) {
  const router = useRouter();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (intent: AnnouncementSubmitIntent) => {
    if (busy || deleting) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(
        announcement ? `/api/admin/announcements/${announcement.id}` : "/api/admin/announcements",
        {
          method: announcement ? "PATCH" : "POST",
          body: buildAnnouncementSubmitPayload({
            title,
            content,
            currentPublished: announcement?.is_published ?? false,
            intent,
          }),
        },
      );
      router.push("/admin/announcements");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "儲存公告失敗");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!announcement || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await apiClient(`/api/admin/announcements/${announcement.id}`, { method: "DELETE" });
      router.push("/admin/announcements");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "刪除公告失敗");
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (announcement?.is_published) {
            void save("save");
          } else {
            void save("publish");
          }
        }}
        className="space-y-5"
      >
        <Field label="標題" htmlFor="announcement-title" required>
          <Input id="announcement-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="內容" htmlFor="announcement-content" required>
          <Textarea id="announcement-content" required rows={18} value={content} onChange={(event) => setContent(event.target.value)} className="leading-7" />
        </Field>
        <FormFeedback error={error} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {announcement ? (
            <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)} disabled={busy || deleting}>
              刪除公告
            </Button>
          ) : <span />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" onClick={() => router.push("/admin/announcements")} variant="outline" disabled={busy || deleting}>
              取消
            </Button>
            {!announcement?.is_published ? (
              <Button type="button" isLoading={busy} onClick={() => void save("save")} variant="outline" disabled={deleting}>
                {announcement ? "儲存變更" : "儲存草稿"}
              </Button>
            ) : null}
            <Button type="submit" isLoading={busy} disabled={deleting}>
              {announcement?.is_published ? "儲存變更" : "發布公告"}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        onConfirm={remove}
        isSubmitting={deleting}
        title="刪除公告"
        description={announcement ? `確定要刪除「${announcement.title}」嗎？此動作無法復原。` : ""}
        confirmLabel="確認刪除"
        confirmVariant="danger"
      />
    </>
  );
}
