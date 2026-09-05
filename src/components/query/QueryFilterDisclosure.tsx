import { ListFilter } from "lucide-react";

import { cn } from "@/utils/className";

type QueryFilterDisclosureProps = Omit<
  React.ComponentProps<"details">,
  "children"
> & {
  children: React.ReactNode;
  label?: string;
  panelClassName?: string;
};

export function QueryFilterDisclosure({
  children,
  className,
  label = "篩選",
  panelClassName,
  ...props
}: QueryFilterDisclosureProps) {
  return (
    <details className={cn("group min-w-0 lg:relative", className)} {...props}>
      <summary className="btn outline flex min-h-10 shrink-0 cursor-pointer list-none items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium marker:content-none">
        <ListFilter aria-hidden="true" className="size-4 shrink-0" />
        {label}
      </summary>
      <div
        className={cn(
          "mt-2 grid w-full max-w-[calc(100vw-2rem)] gap-3 rounded-xl border border-(--border-default) bg-(--surface-default) p-3 lg:absolute lg:right-0 lg:z-20 lg:w-max lg:min-w-64 lg:shadow-(--shadow-card)",
          panelClassName,
        )}
      >
        {children}
      </div>
    </details>
  );
}
