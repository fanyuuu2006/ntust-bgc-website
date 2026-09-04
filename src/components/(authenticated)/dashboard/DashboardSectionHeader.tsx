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
    <header className="flex min-w-0 items-center justify-between gap-3">
      <h2 id={id} className="flex min-w-0 items-center gap-2 text-xl font-semibold text-(--text-primary)">
        <span className="shrink-0 text-(--interactive-primary)">{icon}</span>
        <span className="min-w-0">{title}</span>
      </h2>
      {action ? <span className="shrink-0">{action}</span> : null}
    </header>
  );
}
