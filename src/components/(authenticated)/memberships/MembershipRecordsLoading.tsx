export function MembershipRecordsLoading() {
  return (
    <div
      className="mt-4 space-y-3"
      aria-busy="true"
      aria-label="正在更新社員紀錄"
    >
      <div aria-hidden="true" className="skeleton h-28 rounded-2xl" />
      <div aria-hidden="true" className="skeleton h-28 rounded-2xl" />
    </div>
  );
}
