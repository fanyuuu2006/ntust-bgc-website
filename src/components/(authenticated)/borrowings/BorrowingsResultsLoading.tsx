export function BorrowingsResultsLoading() {
  return (
    <div
      className="space-y-2.5"
      aria-busy="true"
      aria-label="正在更新借用紀錄"
    >
      <div aria-hidden="true" className="skeleton h-28 rounded-2xl" />
      <div aria-hidden="true" className="skeleton h-28 rounded-2xl" />
      <div aria-hidden="true" className="skeleton h-28 rounded-2xl" />
    </div>
  );
}
