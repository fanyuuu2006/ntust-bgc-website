import type { BoardGameBorrowing } from "@/types/database";

type BorrowingCardProps = {
  borrowings: BoardGameBorrowing[];
};

const BORROWING_STATUS_LABEL: Record<string, string> = {
  pending: "審核中",
  approved: "已核准",
  rejected: "已拒絕",
  borrowed: "已借出",
  returned: "已歸還",
};

/**
 * 借閱資料尚未有 repository/service（規劃中功能）。
 * 目前僅接收空陣列，UI 骨架先到位；
 * 之後接上 borrowingsRepository / borrowingsService 後，
 * 只需在 page.tsx 換一個資料來源，這個元件不用改。
 */
export function BorrowingCard({ borrowings }: BorrowingCardProps) {
  return (
    <div className="card rounded-2xl p-6" aria-labelledby="borrowing-heading">
      <h2
        id="borrowing-heading"
        className="mb-4 text-sm font-semibold text-(--muted)"
      >
        桌遊借用紀錄
      </h2>

      {borrowings.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {borrowings.map((borrowing) => (
            <li key={borrowing.id} className="text-sm text-(--foreground)">
              {BORROWING_STATUS_LABEL[borrowing.status] ?? borrowing.status}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-(--muted)">尚無借用紀錄</p>
      )}
    </div>
  );
}
