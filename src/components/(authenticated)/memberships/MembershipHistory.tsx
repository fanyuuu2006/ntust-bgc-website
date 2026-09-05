import { History } from "lucide-react";
import type { ReactNode } from "react";

export function MembershipHistory({
  controls,
  children,
}: {
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="membership-records-title">
      <div>
        <h2
          id="membership-records-title"
          className="flex items-center gap-2 text-xl font-semibold text-(--text-primary)"
        >
          <History aria-hidden="true" className="size-5 text-(--interactive-primary)" />
          社員紀錄
        </h2>
        <p className="mt-1 text-sm text-(--text-muted)">
          查看所有學年度的社員資格紀錄。
        </p>
      </div>

      {controls ? <div className="mt-4">{controls}</div> : null}
      {children}
    </section>
  );
}
