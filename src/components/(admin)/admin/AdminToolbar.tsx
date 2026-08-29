import { cn } from "@/utils/className";
export function AdminToolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("card rounded-xl p-3", className)} {...props} />; }
