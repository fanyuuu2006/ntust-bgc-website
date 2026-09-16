"use client";

import { ImageUp, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/libs/api/errors";
import { AVATAR_MAX_BYTES } from "@/libs/avatar/image";
import type { User } from "@/types/database";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
type AvatarResponse = { data: { avatar: string | null } };

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KiB`;
}

async function readAvatarResponse(response: Response): Promise<AvatarResponse> {
  const payload = await response.json().catch(() => null) as
    | { data?: { avatar?: unknown }; message?: unknown }
    | null;
  if (!response.ok) {
    throw new ApiError(
      typeof payload?.message === "string" ? payload.message : "頭像更新失敗，請稍後再試",
      response.status,
    );
  }
  if (!payload?.data || !(typeof payload.data.avatar === "string" || payload.data.avatar === null)) {
    throw new ApiError("伺服器回應格式不正確，請稍後再試", 500);
  }
  return payload as AvatarResponse;
}

export function AvatarSettingsSection({ user }: { user: Pick<User, "id" | "name" | "avatar"> }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(user.avatar);
  const [file, setFile] = useState<File | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const previewUrl = useMemo(
    () => file ? URL.createObjectURL(file) : null,
    [file],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetSelection() {
    setFile(null);
    setUploadError(null);
    if (inputRef.current) inputRef.current.value = "";
  }
  function closeUpload() {
    if (uploading) return;
    setUploadOpen(false);
    resetSelection();
  }
  function validateFile(nextFile: File): string | null {
    if (nextFile.size === 0) return "圖片檔案不可為空";
    if (nextFile.size > AVATAR_MAX_BYTES) return "圖片檔案不可超過 2 MiB";
    if (!ACCEPTED_TYPES.has(nextFile.type)) return "僅支援 JPEG、PNG 或 WebP 圖片";
    return null;
  }
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) return;
    const error = validateFile(nextFile);
    setUploadError(error);
    setFile(error ? null : nextFile);
    if (error) event.target.value = "";
  }

  async function uploadAvatar() {
    if (!file || uploading) return;
    setUploadError(null); setSuccess(null); setUploading(true);
    try {
      const body = new FormData(); body.append("file", file);
      const payload = await readAvatarResponse(await fetch("/api/users/me/avatar", { method: "POST", body }));
      setAvatar(payload.data.avatar);
      setSuccess(avatar ? "頭像已更新" : "頭像已上傳");
      setUploadOpen(false); resetSelection(); router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setUploadError("頭像已在其他操作中更新，已重新載入最新狀態。"); router.refresh();
      } else setUploadError(error instanceof Error ? error.message : "頭像上傳失敗，請稍後再試");
    } finally { setUploading(false); }
  }

  async function removeAvatar() {
    if (removing) return;
    setRemoveError(null); setSuccess(null); setRemoving(true);
    try {
      await readAvatarResponse(await fetch("/api/users/me/avatar", { method: "DELETE" }));
      setAvatar(null); setRemoveOpen(false); setSuccess("頭像已移除"); router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setRemoveOpen(false); setRemoveError("頭像已在其他操作中更新，已重新載入最新狀態。"); router.refresh();
      } else setRemoveError(error instanceof Error ? error.message : "移除頭像失敗，請稍後再試");
    } finally { setRemoving(false); }
  }

  const actionLabel = avatar ? "更換頭像" : "上傳頭像";
  return <section aria-labelledby="avatar-settings-title">
    <div className="flex min-w-0 flex-col gap-4 rounded-xl bg-(--surface-subtle) p-3 sm:flex-row sm:items-center sm:p-4">
      <UserAvatar user={{ ...user, avatar }} className="size-20 shrink-0 rounded-xl border border-(--border-default) object-cover sm:size-24" />
      <div className="min-w-0 flex-1">
        <h4 id="avatar-settings-title" className="font-semibold text-(--text-primary)">頭像</h4>
        <p className="mt-1 text-sm leading-6 text-(--text-muted)">上傳 JPEG、PNG 或 WebP 圖片，檔案最大 2 MiB。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => { resetSelection(); setUploadOpen(true); }}><ImageUp aria-hidden="true" className="size-4" />{actionLabel}</Button>
          {avatar ? <Button type="button" variant="text" onClick={() => { setRemoveError(null); setRemoveOpen(true); }}><Trash2 aria-hidden="true" className="size-4" />移除頭像</Button> : null}
        </div>
      </div>
    </div>
    <FormFeedback error={removeOpen ? null : removeError} success={success} className="mt-2" />
    <Modal open={uploadOpen} onClose={closeUpload} closeDisabled={uploading} title={actionLabel} description="選擇圖片並確認預覽後再儲存。" size="sm">
      <div className="space-y-4" aria-busy={uploading || undefined}>
        {previewUrl ? <div className="flex min-w-0 items-center gap-3 rounded-xl border border-(--border-default) bg-(--surface-subtle) p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="待上傳的頭像預覽" className="size-20 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-(--text-primary)" title={file?.name}>{file?.name}</p><p className="mt-1 text-xs text-(--text-muted)">{file ? formatFileSize(file.size) : null}</p></div>
        </div> : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-(--border-strong) bg-(--surface-subtle) text-sm text-(--text-muted)">尚未選擇圖片</div>}
        <label className="relative inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) px-4 py-2 text-sm font-medium text-(--text-primary) hover:border-(--border-strong) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--interactive-primary)">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label={file ? "重新選擇頭像圖片" : "選擇頭像圖片"} onChange={handleFileChange} disabled={uploading} className="absolute inset-0 cursor-pointer opacity-0" />
          {file ? <RefreshCw aria-hidden="true" className="size-4" /> : <ImageUp aria-hidden="true" className="size-4" />}{file ? "重新選擇" : "選擇圖片"}
        </label>
        <p className="text-xs text-(--text-muted)">JPEG、PNG、WebP，最大 2 MiB</p>
        <FormFeedback error={uploadError} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closeUpload} disabled={uploading}>取消</Button><Button type="button" onClick={uploadAvatar} disabled={!file || uploading} isLoading={uploading}>{avatar ? "儲存新頭像" : "上傳頭像"}</Button></div>
      </div>
    </Modal>
    <ConfirmDialog open={removeOpen} onClose={() => { if (!removing) setRemoveOpen(false); }} onConfirm={removeAvatar} title="移除頭像？" description="移除後將改回預設頭像。" confirmLabel="移除頭像" isSubmitting={removing} size="sm">
      <FormFeedback error={removeError} />
    </ConfirmDialog>
  </section>;
}
