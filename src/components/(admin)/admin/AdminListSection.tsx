import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/className";

export function AdminListSection({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      className={cn("max-w-full overflow-x-auto overscroll-x-contain", className)}
      {...props}
    />
  );
}
