import type { UserBorrowingListItem } from "./board-games.types";
import { getDueTimePresentation } from "@/utils/date";

/** Use the same due-time states shown on the member borrowing page. */
export function getDashboardBorrowingPriority(
  borrowing: UserBorrowingListItem,
  now = new Date(),
): number {
  if (borrowing.status === "approved") return 1;
  if (borrowing.status === "pending") return 4;
  if (borrowing.status !== "borrowed") return 5;

  const dueState = getDueTimePresentation(borrowing.due_at, now).state;
  if (dueState === "overdue") return 0;
  if (dueState === "due-soon") return 2;
  return 3;
}
