import { cn } from "@/utils/className";
export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table className={cn("w-full text-left text-sm", className)} {...props} />
  );
}
export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("bg-(--secondary-background)", className)}
      {...props}
    />
  );
}
export function TableBody(props: React.ComponentProps<"tbody">) {
  return <tbody {...props} />;
}
export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-t border-(--border-muted) hover:bg-(--surface-subtle)",
        className,
      )}
      {...props}
    />
  );
}
export function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn("px-4 py-3 text-xs font-semibold", className)}
      {...props}
    />
  );
}
export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3", className)} {...props} />;
}
