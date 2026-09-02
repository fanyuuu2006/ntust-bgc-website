import { CalendarClock, CircleCheck, Clock3, TriangleAlert } from "lucide-react";

import { BoardGameImage } from "@/components/BoardGameImage";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { Card } from "@/components/ui/Card";
import type { BoardGameBorrowingWithBoardGame } from "@/services/board-games/board-games.types";
import { formatDateTime, getDueTimePresentation } from "@/utils/date";

export function BorrowingRecord({ borrowing }: { borrowing: BoardGameBorrowingWithBoardGame }) {
  const due = borrowing.status === "borrowed" ? getDueTimePresentation(borrowing.due_at) : null;

  return (
    <article>
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <BoardGameImage boardGame={borrowing.board_game} className="aspect-[4/3] w-full shrink-0 rounded-xl border border-(--border-default) object-cover sm:h-24 sm:w-32" />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-(--text-primary)">{borrowing.board_game.name}</h2>
                <p className="mt-1 text-sm text-(--text-muted)">社產編號 #{borrowing.board_game.inventory_number}</p>
              </div>
              <BorrowingStatusBadge status={borrowing.status} className="shrink-0 self-start" />
            </div>

            <BorrowingStateDetails borrowing={borrowing} due={due} />
          </div>
        </div>
      </Card>
    </article>
  );
}

function BorrowingStateDetails({ borrowing, due }: { borrowing: BoardGameBorrowingWithBoardGame; due: ReturnType<typeof getDueTimePresentation> | null }) {
  if (borrowing.status === "borrowed" && due) {
    const isOverdue = due.state === "overdue";
    const Icon = isOverdue ? TriangleAlert : CalendarClock;
    const dueTone = isOverdue
      ? "text-(--status-danger)"
      : due.state === "due-soon"
        ? "text-(--status-warning)"
        : "text-(--status-info)";

    return <div className="space-y-1.5 text-sm"><p className={`flex items-center gap-2 font-medium ${dueTone}`}><Icon aria-hidden="true" className="size-4 shrink-0" />{due.relative}</p><p className="text-(--text-muted)">{due.absolute ? `${isOverdue ? "應於" : "預計歸還："} ${due.absolute}${isOverdue ? " 前歸還" : ""}` : "歸還期限待確認"}</p></div>;
  }

  if (borrowing.status === "pending") {
    return <RecordMessage icon={Clock3} message="等待幹部確認" dateLabel="提出申請" date={borrowing.created_at} />;
  }
  if (borrowing.status === "approved") {
    return <RecordMessage icon={CircleCheck} message="借用已核准，等待借出" dateLabel="提出申請" date={borrowing.created_at} />;
  }
  if (borrowing.status === "returned") {
    return <RecordMessage icon={CircleCheck} message="已完成歸還" dateLabel="歸還時間" date={borrowing.returned_at} extra={borrowing.borrowed_at ? `借出：${formatDateTime(borrowing.borrowed_at)}` : undefined} />;
  }
  return <RecordMessage icon={Clock3} message="這筆借用申請未獲核准" dateLabel="提出申請" date={borrowing.created_at} />;
}

function RecordMessage({ icon: Icon, message, dateLabel, date, extra }: { icon: typeof Clock3; message: string; dateLabel: string; date: string | null; extra?: string }) {
  return <div className="space-y-1.5 text-sm"><p className="flex items-center gap-2 font-medium text-(--text-primary)"><Icon aria-hidden="true" className="size-4 shrink-0 text-(--text-muted)" />{message}</p><p className="text-(--text-muted)">{dateLabel}：{formatDateTime(date)}</p>{extra ? <p className="text-(--text-muted)">{extra}</p> : null}</div>;
}
