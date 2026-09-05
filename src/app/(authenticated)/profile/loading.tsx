export default function ProfileLoading() {
  return (
    <section
      className="container max-w-5xl space-y-6 py-6 sm:space-y-8 sm:py-8"
      aria-busy="true"
      aria-label="頁面載入中"
    >
      <div aria-hidden="true" className="space-y-6 sm:space-y-8">
        <div className="skeleton h-64 rounded-2xl sm:h-48" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl sm:h-64" />
      </div>
    </section>
  );
}
