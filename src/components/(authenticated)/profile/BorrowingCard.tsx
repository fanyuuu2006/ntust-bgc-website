import type { BoardGameBorrowing } from "@/types/database";

type BorrowingCardProps = {
  borrowings: BoardGameBorrowing[];
};

/**
 * 借閱資料尚未有 repository/service（規劃中功能）。
 * 目前僅接收空陣列，UI 骨架先到位；
 * 之後接上 borrowingsRepository / borrowingsService 後，
 * 只需在 page.tsx 換一個資料來源，這個元件不用改。
 */
export function BorrowingCard({ borrowings }: BorrowingCardProps) {
  return (
    <section className="card p-6" aria-labelledby="borrowing-heading">
      <h2
        id="borrowing-heading"
        className="mb-4 text-sm font-semibold text-(--muted)"
      >
        最近借閱
      </h2>

      {borrowings.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {borrowings.map((borrowing) => (
            <li key={borrowing.id} className="text-sm text-(--foreground)">
              {borrowing.status}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-(--muted)">尚無借閱紀錄</p>
      )}
    </section>
  );
}
