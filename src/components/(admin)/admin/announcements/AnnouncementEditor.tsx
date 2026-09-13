"use client";

import { getAdminReturnPath } from "@/utils/admin-return";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import dynamic from "next/dynamic";
import { editableRichContent, richContentSchema, readRichContent } from "@/libs/rich-content/content";

import { apiClient } from "@/libs/api/client";
import {
  buildAnnouncementSubmitPayload,
  type AnnouncementSubmitIntent,
} from "./announcementEditor.utils";

// Editor code is loaded only for Admin authoring; the public renderer is separate.
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor").then((module) => module.RichTextEditor), {
  ssr: false,
  loading: () => <p role="status" className="min-h-64 p-4 text-sm text-(--text-muted)">正在載入編輯器…</p>,
});

type EditableAnnouncement = {
  id: number;
  title: string;
  content: string;
  content_format?: string;
  rich_content?: unknown;
  is_published: boolean;
};

export function AnnouncementEditor({ announcement, returnTo }: { announcement?: EditableAnnouncement; returnTo?: string }) {
  const router = useRouter();
  const returnHref = getAdminReturnPath(returnTo, "/admin/announcements");
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [initialContent] = useState(() => editableRichContent(announcement));
  // Document updates stay local until submit. Do not reseed on failed mutations
  // or toolbar selection changes, which would discard the author's unsaved work.
  const [content, setContent] = useState<unknown>(initialContent);
  const [contentError, setContentError] = useState<string | undefined>();
  const unsupportedContent = !!announcement?.content_format && announcement.content_format !== "plain_text" && !readRichContent(announcement);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (intent: AnnouncementSubmitIntent) => {
    if (busy || deleting) return;
    const parsed = richContentSchema.safeParse(content);
    if (!parsed.success) { setContentError(parsed.error.issues[0]?.message ?? "請確認公告內容"); return; }
    if (unsupportedContent) { setContentError("此公告格式無法編輯，請先由維護者確認，避免覆寫原始內容。"); return; }
    setContentError(undefined);
    setBusy(true);
    setError(null);
    try {
      await apiClient(
        announcement ? `/api/admin/announcements/${announcement.id}` : "/api/admin/announcements",
        {
          method: announcement ? "PATCH" : "POST",
          body: buildAnnouncementSubmitPayload({
            title,
            richContent: parsed.data,
            currentPublished: announcement?.is_published ?? false,
            intent,
          }),
        },
      );
      router.push(returnHref);
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
      router.push(returnHref);
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
        <Field label="內容" htmlFor="announcement-content" required error={contentError}>
          <RichTextEditor id="announcement-content" label="公告內容" required initialContent={initialContent} onChange={setContent} disabled={busy || deleting || unsupportedContent} invalid={!!contentError} />
          <p className="text-xs text-(--text-muted)">{unsupportedContent ? "此內容格式暫不支援編輯，原始資料不會被覆寫。" : "選取文字後套用粗體、斜體或連結；最多 20,000 字元。"}</p>
        </Field>
        <FormFeedback error={error} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {announcement ? (
            <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)} disabled={busy || deleting}>
              刪除公告
            </Button>
          ) : <span />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" onClick={() => router.push(returnHref)} variant="outline" disabled={busy || deleting}>
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
