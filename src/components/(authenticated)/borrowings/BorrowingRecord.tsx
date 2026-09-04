import { CalendarClock, TriangleAlert } from "lucide-react";

import { CancelBorrowingAction } from "@/components/(authenticated)/borrowings/CancelBorrowingAction";
import { BoardGameImage } from "@/components/BoardGameImage";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { Card } from "@/components/ui/Card";
import type { BoardGameBorrowingWithBoardGame } from "@/services/board-games/board-games.types";
import { formatDateTime, getDueTimePresentation } from "@/utils/date";

export function BorrowingRecord({
  borrowing,
}: {
  borrowing: BoardGameBorrowingWithBoardGame;
}) {
  const due = borrowing.status === "borrowed"
    ? getDueTimePresentation(borrowing.due_at)
    : null;

  return (
    <Card className="p-3 md:p-4">
      <div className="flex min-w-0 items-start gap-2.5">
        <BoardGameImage
          boardGame={borrowing.board_game}
          className="size-12 shrink-0 rounded-lg border border-(--border-default) object-cover md:size-14"
          loading="lazy"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2
                title={borrowing.board_game.name}
                className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold leading-snug text-(--text-primary) md:text-base"
              >
                {borrowing.board_game.name}
              </h2>
              <p className="mt-0.5 text-xs text-(--text-muted)">
                社產編號 #{borrowing.board_game.inventory_number}
              </p>
            </div>
            <BorrowingStatusBadge
              status={borrowing.status}
              className="shrink-0 self-start"
            />
          </div>

          <div className="mt-2 border-t border-(--border-muted) pt-2">
            <div className="md:flex md:items-end md:justify-between md:gap-4">
              <BorrowingLifecycle borrowing={borrowing} due={due} />

              {borrowing.status === "pending" ? (
                <div className="mt-1.5 md:mt-0">
                  <CancelBorrowingAction
                    borrowingId={borrowing.id}
                    boardGameName={borrowing.board_game.name}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BorrowingLifecycle({
  borrowing,
  due,
}: {
  borrowing: BoardGameBorrowingWithBoardGame;
  due: ReturnType<typeof getDueTimePresentation> | null;
}) {
  if (borrowing.status === "borrowed" && due) {
    const isOverdue = due.state === "overdue";
    const isDueSoon = due.state === "due-soon";
    const dueClassName = isOverdue
      ? "text-(--status-danger)"
      : isDueSoon
        ? "text-(--status-warning)"
        : "text-(--status-info)";

    return (
      <div className="min-w-0 space-y-1.5">
        <p className={`flex min-w-0 items-center gap-1.5 text-sm font-medium ${dueClassName}`}>
          {isOverdue ? (
            <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          ) : (
            <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
          )}
          <span className="break-words">{due.relative}</span>
        </p>
        <p className="break-words text-xs leading-5 text-(--text-muted)">
          {due.absolute ? `歸還期限：${due.absolute}` : "尚未設定歸還期限"}
        </p>
      </div>
    );
  }

  if (borrowing.status === "pending") {
    return <LifecycleMessage message="等待幹部確認" timestampLabel="提出申請" timestamp={borrowing.created_at} />;
  }

  if (borrowing.status === "approved") {
    return <LifecycleMessage message="已核准，等待領取" timestampLabel="提出申請" timestamp={borrowing.created_at} />;
  }

  if (borrowing.status === "returned") {
    return <LifecycleMessage message="已完成歸還" timestampLabel="歸還時間" timestamp={borrowing.returned_at} />;
  }

  if (borrowing.status === "cancelled") {
    return <LifecycleMessage message="借用申請已取消" timestampLabel="提出申請" timestamp={borrowing.created_at} />;
  }

  return <LifecycleMessage message="申請未獲核准" timestampLabel="提出申請" timestamp={borrowing.created_at} />;
}

function LifecycleMessage({
  message,
  timestampLabel,
  timestamp,
}: {
  message: string;
  timestampLabel: string;
  timestamp: string | null;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="break-words text-sm font-medium text-(--text-secondary)">{message}</p>
      {timestamp ? (
        <p className="break-words text-xs leading-5 text-(--text-muted)">
          {timestampLabel}：{formatDateTime(timestamp)}
        </p>
      ) : null}
    </div>
  );
}
