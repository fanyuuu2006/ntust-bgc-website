import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/className";

export function AdminListSection({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn("overflow-x-auto", className)} {...props} />;
}
