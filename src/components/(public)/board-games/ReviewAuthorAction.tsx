"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { ReviewRating } from "@/services/reviews/reviews.types";
import { RatingInput } from "./RatingInput";
import { RatingStars } from "./RatingStars";

type OwnReview = { rating: ReviewRating; content: string | null };

export function ReviewAuthorAction({ boardGameId, eligibility, ownReview }: {
  boardGameId: string;
  eligibility: "anonymous" | "unverified" | "verified" | "unavailable";
  ownReview: OwnReview | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [rating, setRating] = useState<ReviewRating | null>(ownReview?.rating ?? null);
  const [content, setContent] = useState(ownReview?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (eligibility === "anonymous") {
    return <ButtonLink variant="outline" size="sm" href={`/login?returnTo=${encodeURIComponent(`/board-games/${boardGameId}#board-game-reviews`)}`} className="mt-5 min-h-11">登入後評分</ButtonLink>;
  }
  if (eligibility === "unverified") {
    return <p className="mt-5 text-sm text-(--text-muted)">請先完成 Email 驗證後再評分。<ButtonLink variant="text" size="sm" href="/verify-email/pending">前往驗證</ButtonLink></p>;
  }
  if (eligibility === "unavailable") return null;

  const openEditor = () => {
    setRating(ownReview?.rating ?? null);
    setContent(ownReview?.content ?? "");
    setError(null);
    setSuccess(null);
    setEditing(true);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (rating === null) { setError("請選擇 1 到 5 分的評分"); return; }
    if (Array.from(content.replace(/\r\n?/g, "\n").trim()).length > 2000) { setError("評論不可超過 2000 字"); return; }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await apiClient(ownReview ? `/api/board-games/${boardGameId}/reviews/me` : `/api/board-games/${boardGameId}/reviews`, {
        method: ownReview ? "PATCH" : "POST", body: { rating, content },
      });
      setEditing(false);
      setSuccess(ownReview ? "評分已更新" : "評分已送出");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "發生非預期錯誤，請稍後再試");
    } finally { inFlight.current = false; setBusy(false); }
  };
  const remove = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/board-games/${boardGameId}/reviews/me`, { method: "DELETE" });
      setConfirmingDelete(false);
      setSuccess("評分已刪除");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "刪除評分失敗，請稍後再試");
      setConfirmingDelete(false);
    } finally { inFlight.current = false; setBusy(false); }
  };

  return <div className="mt-5 min-w-0 space-y-3">
    {ownReview ? <div className="flex min-w-0 flex-col gap-3 border-t border-(--border-muted) pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-(--text-muted)">你的評分</p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <RatingStars rating={ownReview.rating} label={`你的評分 ${ownReview.rating} 分`} />
          <span className="text-xs text-(--text-muted)">{ownReview.content ? "已留下文字評論" : "只有評分"}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
        <Button variant="text" size="sm" className="min-h-11" onClick={openEditor}>編輯評分</Button>
        <span aria-hidden="true" className="text-(--border-strong)">·</span>
        <Button variant="text" size="sm" className="min-h-11" onClick={() => { setError(null); setConfirmingDelete(true); }}>刪除</Button>
      </div>
    </div> : <Button variant="outline" size="sm" className="min-h-11" onClick={openEditor}>評分這款桌遊</Button>}
    <FormFeedback error={editing ? null : error} success={success} />
    {editing ? <Modal open onClose={() => { if (!busy) setEditing(false); }} closeDisabled={busy} title={ownReview ? "編輯我的評分" : "評分這款桌遊"}>
      <form onSubmit={submit} className="space-y-5">
        <RatingInput value={rating} onChange={setRating} disabled={busy} invalid={rating === null && Boolean(error)} />
        <div>
          <label htmlFor="my-review-content" className="mb-2 block text-sm font-medium">文字評論（選填）</label>
          <Textarea id="my-review-content" rows={5} maxLength={2000} value={content} onChange={(event) => setContent(event.target.value)} disabled={busy} aria-describedby="my-review-count" placeholder="分享你的遊玩感受" className="max-h-[40dvh]" />
          <p id="my-review-count" className="mt-1 text-right text-xs tabular-nums text-(--text-muted)">{Array.from(content).length} / 2000 字</p>
        </div>
        <FormFeedback error={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setEditing(false)} disabled={busy}>取消</Button>
          <Button type="submit" isLoading={busy} disabled={rating === null}>儲存評分</Button>
        </div>
      </form>
    </Modal> : null}
    <ConfirmDialog open={confirmingDelete} onClose={() => { if (!busy) setConfirmingDelete(false); }} onConfirm={remove} title="刪除你的評分？" description="你的星等與文字評論都會一併移除。" confirmLabel="刪除評分" isSubmitting={busy} />
  </div>;
}
