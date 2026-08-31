"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/libs/api/client";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormFeedback } from "@/components/FormFeedback";
export function AnnouncementEditor({
  announcement,
}: {
  announcement?: {
    id: number;
    title: string;
    content: string;
    is_published: boolean;
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (published: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(
        announcement
          ? `/api/admin/announcements/${announcement.id}`
          : "/api/admin/announcements",
        {
          method: announcement ? "PATCH" : "POST",
          body: { title, content, is_published: published },
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
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(true);
      }}
      className="space-y-5"
    >
      <Field label="標題" htmlFor="announcement-title" required>
        <Input
          id="announcement-title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="內容" htmlFor="announcement-content" required>
        <Textarea
          id="announcement-content"
          required
          rows={18}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="leading-7"
        />
      </Field>
      <FormFeedback error={error} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          onClick={() => router.push("/admin/announcements")}
          variant="outline"
        >
          取消
        </Button>
        <Button
          type="button"
          isLoading={busy}
          onClick={() => void save(false)}
          variant="outline"
        >
          儲存草稿
        </Button>
        <Button
          type="submit"
          isLoading={busy}
        >
          {announcement?.is_published ? "儲存" : "發布"}
        </Button>
      </div>
    </form>
  );
}
