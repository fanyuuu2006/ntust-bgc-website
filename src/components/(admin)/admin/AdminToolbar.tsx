import { cn } from "@/utils/className";

export function AdminToolbar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0", className)} {...props} />;
}
