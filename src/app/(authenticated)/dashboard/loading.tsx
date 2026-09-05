export default function DashboardLoading() {
  return (
    <section
      className="container py-8"
      aria-busy="true"
      aria-label="頁面載入中"
    >
      <div aria-hidden="true" className="space-y-6">
        <div className="skeleton h-9 w-56 max-w-full rounded-lg" />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-5">
            <div className="skeleton h-40 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
          <div className="space-y-5">
            <div className="skeleton h-40 rounded-2xl" />
            <div className="skeleton h-44 rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
