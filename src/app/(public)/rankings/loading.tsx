export default function RankingsLoading() {
  return (
    <section className="container py-8" aria-busy="true" aria-label="排行榜載入中">
      <div className="skeleton h-9 w-36 rounded" />
      <div className="skeleton mt-3 h-5 w-full max-w-xl rounded" />
      <div className="mt-7 flex items-center justify-between gap-4"><div className="skeleton h-6 w-28 rounded" /><div className="skeleton h-5 w-20 rounded" /></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">{Array.from({ length: 4 }, (_, index) => <div key={index} className="skeleton h-11 rounded-xl sm:w-24" />)}</div>
      <div className="mt-4 rounded-2xl border border-(--border-default) px-3 sm:px-5">
        {Array.from({ length: 3 }, (_, index) => <div key={index} className="skeleton my-3.5 h-16 w-full rounded-xl" />)}
      </div>
    </section>
  );
}
