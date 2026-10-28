import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type HomeSectionProps = {
  id?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children: ReactNode;
  className?: string;
};

export function HomeSection({ id, title, description, action, children, className = "" }: HomeSectionProps) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={titleId} className={`scroll-mt-20 ${className}`}>
      <div className="container py-10 sm:py-14 lg:py-16">
        <div className="flex flex-col items-start gap-2 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-2xl font-bold text-(--text-primary) sm:text-3xl">{title}</h2>
            {description ? <p className="mt-1 text-sm text-(--text-muted) sm:text-base">{description}</p> : null}
          </div>
          {action ? <Link href={action.href} className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-(--interactive-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)">{action.label}<ArrowRight aria-hidden="true" className="size-4" /></Link> : null}
        </div>
        {children}
      </div>
    </section>
  );
}
