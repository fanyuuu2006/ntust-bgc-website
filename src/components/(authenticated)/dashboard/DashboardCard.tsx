import { cn } from "@/utils/className";

type DashboardCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
};

export function DashboardCard({
  title,
  children,
  className,
  ...rest
}: DashboardCardProps) {
  return (
    <div className={cn("card flex flex-col gap-4 p-6", className)} {...rest}>
      <h2 className="text-lg font-semibold text-(--foreground)">{title}</h2>

      {children}
    </div>
  );
}
