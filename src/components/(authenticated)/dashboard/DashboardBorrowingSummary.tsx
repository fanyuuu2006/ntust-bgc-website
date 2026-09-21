import {
  ArrowRight,
  CalendarClock,
  PackageOpen,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { DashboardSectionHeader } from "@/components/(authenticated)/dashboard/DashboardSectionHeader";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { UserBorrowingListItem } from "@/services/board-games/board-games.types";
import { getDueTimePresentation } from "@/utils/date";
import { buildBoardGameDetailHref } from "@/libs/board-game-return";
import { getDashboardBorrowingPriority } from "@/services/board-games/dashboard-borrowing-priority";

export function DashboardBorrowingSummary({
  borrowings,
}: {
  borrowings: UserBorrowingListItem[];
}) {
  return (
    <Card surface={borrowings.length === 0 ? "subtle" : "default"} className="p-3 sm:p-4">
      <section aria-labelledby="dashboard-borrowings-title">
        <DashboardSectionHeader
          id="dashboard-borrowings-title"
          icon={<PackageOpen aria-hidden="true" className="size-5" />}
          title="借用近況"
          action={
            <ButtonLink
              href="/borrowings"
              variant="text"
              size="sm"
              className="px-0"
            >
              查看全部
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          }
        />

        {borrowings.length === 0 ? (
          <p className="mt-3 text-sm text-(--text-muted)">
            目前沒有進行中的借用。
          </p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-1.5 sm:mt-3 sm:gap-2">
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
  borrowing: UserBorrowingListItem;
}) {
  const dueTime =
    borrowing.status === "borrowed"
      ? getDueTimePresentation(borrowing.due_at)
      : null;
  const statusMessage =
    borrowing.status === "pending"
      ? "等待幹部審核"
      : borrowing.status === "approved"
        ? "已核准，等待領取"
        : null;
  const isOverdue = dueTime?.state === "overdue";
  const priority = getDashboardBorrowingPriority(borrowing);
  const dueClassName = isOverdue
    ? "text-(--status-danger)"
    : dueTime?.state === "due-soon"
      ? "text-(--status-warning)"
      : "text-(--text-primary)";

  return (
    <li className={`rounded-xl bg-(--surface-subtle) px-2.5 py-2 sm:px-3 sm:py-2.5 ${priority === 0 ? "border-l-2 border-l-(--status-danger)" : priority === 1 ? "border-l-2 border-l-(--status-info)" : ""}`}>
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={buildBoardGameDetailHref(borrowing.board_game.id, "/dashboard")}
            className="wrap-anywhere font-semibold leading-6 text-(--interactive-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            {borrowing.board_game.name}
          </Link>
          <p className="mt-0.5 wrap-anywhere text-xs text-(--text-muted)">
            社產編號 #{borrowing.board_game.inventory_number}
          </p>
        </div>
        <BorrowingStatusBadge
          status={borrowing.status}
          className="shrink-0 self-start"
        />
      </div>

      {dueTime ? (
        <div className="mt-1.5 space-y-0.5 sm:mt-2 sm:space-y-1">
          <p
            className={`flex min-w-0 items-center gap-2 text-sm font-medium ${dueClassName}`}
          >
            {isOverdue ? (
              <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
            )}
            {dueTime.relative}
          </p>
          <p className="wrap-anywhere text-sm text-(--text-muted)">
            {dueTime.absolute
              ? isOverdue
                ? `應於 ${dueTime.absolute} 前歸還`
                : `預計於 ${dueTime.absolute} 前歸還`
              : "尚未設定預計歸還時間"}
          </p>
        </div>
      ) : statusMessage ? (
        <p className="mt-1.5 text-sm text-(--text-muted) sm:mt-2">{statusMessage}</p>
      ) : null}
    </li>
  );
}
