import { cn } from "@/utils/className";
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card rounded-2xl", className)} {...props} />;
}
