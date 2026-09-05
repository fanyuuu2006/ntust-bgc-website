export default function BorrowingsLoading() {
  return (
    <section className="py-8" aria-busy="true" aria-label="頁面載入中">
      <div aria-hidden="true" className="container max-w-3xl space-y-6">
        <div className="space-y-2">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-9 w-40 rounded-lg" />
          <div className="skeleton h-5 w-full max-w-md rounded" />
        </div>
        <div className="skeleton h-10 rounded-lg" />
        <div className="space-y-2.5">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}
