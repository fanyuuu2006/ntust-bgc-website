import { cn } from "@/utils/className";
export function Select({ className, ...props }: React.ComponentProps<"select">) { return <select className={cn("rounded-lg border border-(--border) bg-(--primary-background) px-3 py-2.5 text-sm outline-none focus:border-(--primary) disabled:cursor-not-allowed disabled:opacity-60", className)} {...props} />; }
