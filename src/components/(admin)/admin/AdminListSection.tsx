import { cn } from "@/utils/className";
export function AdminListSection({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("card overflow-x-auto rounded-xl", className)} {...props} />; }
