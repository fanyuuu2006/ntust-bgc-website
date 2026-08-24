import { cn } from "@/utils/className";
export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) { return <textarea className={cn("w-full rounded-lg border border-(--border) bg-(--primary-background) px-3 py-2.5 text-sm outline-none focus:border-(--primary) disabled:cursor-not-allowed disabled:opacity-60", className)} {...props} />; }
