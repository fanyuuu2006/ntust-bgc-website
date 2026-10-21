export function SettingsCardLoading({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="設定內容載入中" className="card rounded-2xl p-4 sm:p-6">
      <div aria-hidden="true">
        <div className="skeleton h-6 w-28 rounded" />
        <div className="skeleton mt-2 h-4 w-full max-w-sm rounded" />
        <div className="mt-5 border-t border-(--border-default) pt-5">
          <div className="space-y-4">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
