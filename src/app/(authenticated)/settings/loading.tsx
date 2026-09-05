export default function SettingsLoading() {
  return (
    <section
      className="container max-w-5xl space-y-5 py-6 sm:space-y-6 sm:py-8"
      aria-busy="true"
      aria-label="頁面載入中"
    >
      <div aria-hidden="true" className="space-y-5 sm:space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-9 w-28 rounded-lg" />
          <div className="skeleton h-5 w-full max-w-lg rounded" />
        </div>
        <div className="skeleton h-96 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    </section>
  );
}
