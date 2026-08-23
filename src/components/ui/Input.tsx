import { cn } from "@/utils/className";
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "rounded-lg border border-(--border) bg-(--primary-background) px-3 py-2.5 text-sm outline-none focus:border-(--primary) disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
