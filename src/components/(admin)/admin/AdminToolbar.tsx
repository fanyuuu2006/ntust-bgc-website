import { cn } from "@/utils/className";
export function AdminToolbar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("card flex flex-col gap-3 rounded-xl p-3 lg:flex-row lg:items-center", className)} {...props} />; }
