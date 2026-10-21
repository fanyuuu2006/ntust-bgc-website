export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="設定分類載入中" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} aria-hidden="true" className="skeleton h-28 rounded-2xl" />
      ))}
    </div>
  );
}
