export default function MembershipsLoading() {
  return (
    <section
      className="container max-w-5xl space-y-8 py-8"
      aria-busy="true"
      aria-label="頁面載入中"
    >
      <div aria-hidden="true" className="space-y-8">
        <div className="space-y-2">
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-9 w-44 rounded-lg" />
          <div className="skeleton h-5 w-full max-w-lg rounded" />
        </div>
        <div className="skeleton h-48 rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton h-10 rounded-lg" />
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}
