"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/libs/api/client";
export function AnnouncementEditor({
  announcement,
}: {
  announcement?: {
    id: string;
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
      <label className="block text-sm font-medium">
        標題
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-(--border) px-3 py-2.5"
        />
      </label>
      <label className="block text-sm font-medium">
        內容
        <textarea
          required
          rows={18}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-(--border) px-3 py-2.5 leading-7"
        />
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/admin/announcements")}
          className="btn outline shrink-0 whitespace-nowrap rounded-lg px-4 py-2"
        >
          取消
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="btn outline shrink-0 whitespace-nowrap rounded-lg px-4 py-2"
        >
          儲存草稿
        </button>
        <button
          disabled={busy}
          className="btn primary shrink-0 whitespace-nowrap rounded-lg px-4 py-2"
        >
          {busy ? "儲存中…" : announcement?.is_published ? "儲存" : "發布"}
        </button>
      </div>
    </form>
  );
}
