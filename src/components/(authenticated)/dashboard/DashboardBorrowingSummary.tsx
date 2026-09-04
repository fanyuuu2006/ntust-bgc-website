import { ArrowRight, CalendarClock, PackageOpen, TriangleAlert } from "lucide-react";

import { DashboardSectionHeader } from "@/components/(authenticated)/dashboard/DashboardSectionHeader";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { BoardGameBorrowingWithBoardGame } from "@/services/board-games/board-games.types";
import { getDueTimePresentation } from "@/utils/date";

export function DashboardBorrowingSummary({
  borrowings,
}: {
  borrowings: BoardGameBorrowingWithBoardGame[];
}) {
  return (
    <Card className="p-4">
      <section aria-labelledby="dashboard-borrowings-title">
        <DashboardSectionHeader
          id="dashboard-borrowings-title"
          icon={<PackageOpen aria-hidden="true" className="size-5" />}
          title="我的借用"
          action={
            <ButtonLink href="/borrowings" variant="text" size="sm" className="px-0">
              查看全部
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          }
        />

        {borrowings.length === 0 ? (
          <p className="mt-3 text-sm text-(--text-muted)">目前沒有進行中的借用。</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {borrowings.map((borrowing) => (
              <BorrowingRow key={borrowing.id} borrowing={borrowing} />
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}

function BorrowingRow({
  borrowing,
}: {
  borrowing: BoardGameBorrowingWithBoardGame;
}) {
  const dueTime = borrowing.status === "borrowed"
    ? getDueTimePresentation(borrowing.due_at)
    : null;
  const statusMessage = borrowing.status === "pending"
    ? "申請已送出，等待管理員處理。"
    : borrowing.status === "approved"
      ? "借用已核准，等待確認借出。"
      : null;
  const isOverdue = dueTime?.state === "overdue";
  const dueClassName = isOverdue
    ? "text-(--status-danger)"
    : dueTime?.state === "due-soon"
      ? "text-(--status-warning)"
      : "text-(--text-primary)";

  return (
    <li className="rounded-xl bg-(--surface-subtle) px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold leading-6 text-(--text-primary)">
            {borrowing.board_game.name}
          </p>
          <p className="mt-1 text-xs text-(--text-muted)">
            社產編號 #{borrowing.board_game.inventory_number}
          </p>
        </div>
        <BorrowingStatusBadge status={borrowing.status} className="shrink-0 self-start" />
      </div>

      {dueTime ? (
        <div className="mt-2 space-y-1">
          <p className={`flex min-w-0 items-center gap-2 text-sm font-medium ${dueClassName}`}>
            {isOverdue ? (
              <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
            )}
            {dueTime.relative}
          </p>
          <p className="break-words text-sm text-(--text-muted)">
            {dueTime.absolute
              ? isOverdue
                ? `應於 ${dueTime.absolute} 前歸還`
                : `預計於 ${dueTime.absolute} 前歸還`
              : "尚未設定預計歸還時間"}
          </p>
        </div>
      ) : statusMessage ? (
        <p className="mt-2 text-sm text-(--text-muted)">{statusMessage}</p>
      ) : null}
    </li>
  );
}
