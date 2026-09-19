"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminUserIdentity } from "@/components/(admin)/admin/users/AdminUserIdentity";
import { RatingStars } from "@/components/(public)/board-games/RatingStars";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import type { AdminReview } from "@/services/reviews/admin-reviews.types";
import { formatDateTime } from "@/utils/date";
import { wasReviewMeaningfullyEdited } from "@/utils/review-presentation";

const EMPTY_CONTENT = "未填寫文字評價";

export function AdminReviewRecords({
  reviews,
  hasQuery,
}: {
  reviews: AdminReview[];
  hasQuery: boolean;
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState<AdminReview | null>(null);
  const [deleting, setDeleting] = useState<AdminReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeReview() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/admin/reviews/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "刪除評價失敗");
    } finally {
      setBusy(false);
    }
  }

  if (!reviews.length) {
    return hasQuery ? (
      <QueryEmptyState
        title="找不到符合條件的評價"
        description="請調整搜尋文字或篩選條件。"
        clearHref="/admin/reviews"
      />
    ) : (
      <EmptyState title="目前沒有評價" description="網站尚未收到任何桌遊評價。" />
    );
  }

  return (
    <>
      <Card className="hidden overflow-x-auto p-0 lg:block">
        <Table className="min-w-[1120px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-56">作者</TableHead>
              <TableHead className="w-48">桌遊</TableHead>
              <TableHead className="w-32">評分</TableHead>
              <TableHead>文字評價</TableHead>
              <TableHead className="w-40">時間</TableHead>
              <TableHead className="w-36 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell className="min-w-0 align-top">
                  <AdminUserIdentity
                    identity={review.author}
                    disambiguation={review.author.closed_at ? undefined : "email"}
                  />
                </TableCell>
                <TableCell className="min-w-0 align-top">
                  <Link
                    href={`/board-games/${review.boardGame.id}`}
                    className="block truncate font-medium hover:underline"
                    title={review.boardGame.name}
                  >
                    {review.boardGame.name}
                  </Link>
                </TableCell>
                <TableCell className="align-top">
                  <RatingStars rating={review.rating} size="sm" label={`評分 ${review.rating} 分`} />
                </TableCell>
                <TableCell className="min-w-0 align-top">
                  <ReviewExcerpt review={review} onView={() => setViewing(review)} />
                </TableCell>
                <TableCell className="align-top text-sm tabular-nums text-(--text-muted)">
                  <p>{formatDateTime(review.createdAt)}</p>
                  {wasReviewMeaningfullyEdited(review.createdAt, review.updatedAt) ? (
                    <p className="mt-1">已編輯 {formatDateTime(review.updatedAt)}</p>
                  ) : null}
                </TableCell>
                <TableCell className="align-top text-right">
                  <Button type="button" size="sm" variant="danger" onClick={() => { setDeleting(review); setError(null); }}>
                    刪除
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid min-w-0 gap-3 lg:hidden">
        {reviews.map((review) => (
          <Card key={review.id} className="min-w-0 p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <AdminUserIdentity
                identity={review.author}
                disambiguation={review.author.closed_at ? undefined : "email"}
                variant="mobile"
                className="flex-1"
              />
              <RatingStars rating={review.rating} size="sm" label={`評分 ${review.rating} 分`} />
            </div>
            <Link
              href={`/board-games/${review.boardGame.id}`}
              className="mt-3 block truncate text-sm font-medium hover:underline"
              title={review.boardGame.name}
            >
              {review.boardGame.name}
            </Link>
            <div className="mt-3"><ReviewExcerpt review={review} onView={() => setViewing(review)} /></div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs tabular-nums text-(--text-muted)">{formatDateTime(review.createdAt)}</p>
              <Button type="button" size="sm" variant="danger" onClick={() => { setDeleting(review); setError(null); }}>
                刪除
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title="完整評價內容"
        description={viewing ? `${viewing.boardGame.name} · ${viewing.rating} 星` : undefined}
        size="lg"
      >
        <p className="wrap-anywhere whitespace-pre-wrap leading-7">{viewing?.content ?? EMPTY_CONTENT}</p>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => !busy && setDeleting(null)}
        onConfirm={removeReview}
        isSubmitting={busy}
        title="刪除評價"
        description={deleting ? `確定要刪除這筆評價嗎？作者：${getAuthorLabel(deleting)}；桌遊：${deleting.boardGame.name}；評分：${deleting.rating} 星。此操作無法復原。${error ? ` ${error}` : ""}` : ""}
        confirmLabel="確認刪除"
      />
    </>
  );
}

function ReviewExcerpt({ review, onView }: { review: AdminReview; onView: () => void }) {
  if (!review.content) return <p className="text-sm text-(--text-muted)">{EMPTY_CONTENT}</p>;
  return (
    <div className="min-w-0">
      <p className="line-clamp-3 wrap-anywhere whitespace-pre-line text-sm leading-6">
        {review.content}
      </p>
      <Button type="button" size="sm" variant="text" className="mt-1" onClick={onView}>
        查看完整內容
      </Button>
    </div>
  );
}

function getAuthorLabel(review: AdminReview) {
  if (review.author.closed_at) return "已註銷使用者";
  return review.author.real_name?.trim() || review.author.name;
}
