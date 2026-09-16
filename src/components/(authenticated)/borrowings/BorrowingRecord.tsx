import { CalendarClock, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { CancelBorrowingAction } from "@/components/(authenticated)/borrowings/CancelBorrowingAction";
import { BoardGameImage } from "@/components/BoardGameImage";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { Card } from "@/components/ui/Card";
import type { UserBorrowingListItem } from "@/services/board-games/board-games.types";
import { formatCompactLifecycleDate, formatDateTime, getDueTimePresentation } from "@/utils/date";

export function BorrowingRecord({
  borrowing,
}: {
  borrowing: UserBorrowingListItem;
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
              <h2 className="min-w-0 flex-1 text-sm font-semibold leading-snug md:text-base">
                <Link
                  href={`/board-games/${borrowing.board_game.id}`}
                  title={borrowing.board_game.name}
                  className="line-clamp-2 text-(--interactive-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
                >
                  {borrowing.board_game.name}
                </Link>
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
  borrowing: UserBorrowingListItem;
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
          <span className="wrap-anywhere">{due.relative}</span>
        </p>
        <p className="wrap-anywhere text-xs leading-5 text-(--text-muted)">
          {due.absolute ? `歸還期限 · ${due.absolute}` : "尚未設定歸還期限"}
        </p>
        <LifecycleFacts borrowing={borrowing} include={["created_at", "approved_at", "borrowed_at"]} />
      </div>
    );
  }

  if (borrowing.status === "pending") {
    return <LifecycleMessage message="等待幹部審核" timestampLabel="申請於" timestamp={borrowing.created_at} />;
  }

  if (borrowing.status === "approved") {
    return <div className="min-w-0 space-y-1"><LifecycleMessage message="已核准，等待領取" timestampLabel="核准於" timestamp={borrowing.approved_at} /><LifecycleFacts borrowing={borrowing} include={["created_at", "approved_at"]} /></div>;
  }

  if (borrowing.status === "returned") {
    return <div className="min-w-0 space-y-1"><LifecycleMessage message={borrowing.returned_at ? `${formatDateTime(borrowing.returned_at)} 已歸還` : "已完成歸還"} /><LifecycleFacts borrowing={borrowing} include={["created_at", "approved_at", "borrowed_at", "returned_at"]} /></div>;
  }

  if (borrowing.status === "cancelled") {
    return <div className="min-w-0 space-y-1"><LifecycleMessage message="借用申請已取消" timestampLabel="取消於" timestamp={borrowing.cancelled_at} /><LifecycleFacts borrowing={borrowing} include={["created_at", "cancelled_at"]} /></div>;
  }

  return <div className="min-w-0 space-y-1"><LifecycleMessage message="申請未獲核准" timestampLabel="拒絕於" timestamp={borrowing.rejected_at} /><LifecycleFacts borrowing={borrowing} include={["created_at", "rejected_at"]} /></div>;
}

function LifecycleMessage({
  message,
  timestampLabel,
  timestamp,
}: {
  message: string;
  timestampLabel?: string;
  timestamp?: string | null;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="wrap-anywhere text-sm font-medium text-(--text-secondary)">{message}</p>
      {timestamp ? (
        <p className="wrap-anywhere text-xs leading-5 text-(--text-muted)">
          {timestampLabel} {formatDateTime(timestamp)}
        </p>
      ) : null}
    </div>
  );
}

type LifecycleTimestampKey = "created_at" | "approved_at" | "borrowed_at" | "returned_at" | "rejected_at" | "cancelled_at";

function LifecycleFacts({ borrowing, include }: { borrowing: UserBorrowingListItem; include: LifecycleTimestampKey[] }) {
  const labels: Record<LifecycleTimestampKey, string> = {
    created_at: "申請", approved_at: "核准", borrowed_at: "領取", returned_at: "歸還", rejected_at: "拒絕", cancelled_at: "取消",
  };
  const facts = include.flatMap((key) => {
    const date = formatCompactLifecycleDate(borrowing[key], borrowing.created_at);
    return date ? [`${labels[key]} ${date}`] : [];
  });
  return facts.length ? <p className="wrap-anywhere text-xs leading-5 text-(--text-muted)">{facts.join(" · ")}</p> : null;
}
