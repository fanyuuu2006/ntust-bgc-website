import { cn } from "@/utils/className";

export function AdminMobileRecord({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <article className={cn("card rounded-2xl space-y-3 p-4", className)} {...props} />;
}

export function AdminMobileRecordHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-3", className)} {...props} />;
}

export function AdminMobileRecordMetadata({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid grid-cols-2 gap-3 text-sm", className)} {...props} />;
}

export function AdminMobileRecordActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap gap-2", className)} {...props} />;
}
