import { ArrowRight, CalendarClock, PackageOpen, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { BoardGameBorrowingWithBoardGame } from "@/services/board-games/board-games.types";
import { getDueTimePresentation } from "@/utils/date";

const DASHBOARD_BORROWING_LIMIT = 5;

export function DashboardBorrowingSummary({
  borrowings,
}: {
  borrowings: BoardGameBorrowingWithBoardGame[];
}) {
  const visibleBorrowings = borrowings.slice(0, DASHBOARD_BORROWING_LIMIT);

  return (
    <section aria-labelledby="dashboard-borrowings-title">
      <SectionHeader
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

      {visibleBorrowings.length === 0 ? (
        <EmptyState
          compact
          className="mt-4 border border-(--border-default) bg-(--surface-subtle) p-4 text-left"
          title="目前沒有進行中的借用"
          description="想借桌遊時，可以先到桌遊頁查看可借用的社產。"
          action={
            <ButtonLink href="/board-games" variant="text" size="sm" className="px-0">
              去看桌遊
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          }
        />
      ) : (
        <ul className="mt-4 grid gap-3">
          {visibleBorrowings.map((borrowing) => (
            <BorrowingSurface key={borrowing.id} borrowing={borrowing} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BorrowingSurface({
  borrowing,
}: {
  borrowing: BoardGameBorrowingWithBoardGame;
}) {
  const dueTime = borrowing.status === "borrowed"
    ? getDueTimePresentation(borrowing.due_at)
    : null;
  const statusMessage = borrowing.status === "pending"
    ? "等待幹部確認"
    : borrowing.status === "approved"
      ? "借用已核准，等待借出"
      : null;
  const isOverdue = dueTime?.state === "overdue";
  const dueClassName = isOverdue
    ? "text-(--status-danger)"
    : dueTime?.state === "due-soon"
      ? "text-(--status-warning)"
      : "text-(--text-primary)";

  return (
    <li>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-(--text-primary)">
              {borrowing.board_game.name}
            </p>
            <p className="mt-1 text-xs text-(--text-muted)">
              社產編號 #{borrowing.board_game.inventory_number}
            </p>
          </div>
          <BorrowingStatusBadge status={borrowing.status} className="shrink-0" />
        </div>

        {dueTime ? (
          <div className="mt-4 space-y-1.5">
            <p className={`flex items-center gap-2 text-sm font-medium ${dueClassName}`}>
              {isOverdue ? (
                <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
              ) : (
                <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
              )}
              {dueTime.relative}
            </p>
            <p className="text-sm text-(--text-muted)">
              {dueTime.absolute
                ? isOverdue
                  ? `應於 ${dueTime.absolute} 前歸還`
                  : `預計歸還：${dueTime.absolute}`
                : "請向幹部確認歸還時間"}
            </p>
          </div>
        ) : statusMessage ? (
          <p className="mt-4 text-sm text-(--text-muted)">{statusMessage}</p>
        ) : null}
      </Card>
    </li>
  );
}

function SectionHeader({
  id,
  icon,
  title,
  action,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-xl font-semibold text-(--text-primary)">
        <span className="text-(--interactive-primary)">{icon}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}
