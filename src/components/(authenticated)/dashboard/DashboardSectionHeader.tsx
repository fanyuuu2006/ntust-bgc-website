import type { ReactNode } from "react";

export function DashboardSectionHeader({
  id,
  icon,
  title,
  action,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 id={id} className="flex min-w-0 flex-1 items-center gap-2 text-lg font-semibold text-(--text-primary) sm:text-xl">
        <span className="shrink-0 text-(--interactive-primary)">{icon}</span>
        <span className="min-w-0">{title}</span>
      </h2>
      {action ? <span className="shrink-0">{action}</span> : null}
    </header>
  );
}
