import { cn } from "@/utils/className";

export const formControlClassName =
  "w-full min-h-10 rounded-lg border border-(--border-default) bg-(--surface-default) px-3 py-2 text-sm text-(--text-primary) outline-none placeholder:text-(--text-muted) aria-invalid:border-(--status-danger) disabled:cursor-not-allowed disabled:bg-(--surface-subtle) disabled:text-(--text-muted) disabled:opacity-80";

type InputProps = React.ComponentProps<"input"> & {
  invalid?: boolean;
};

export function Input({
  className,
  invalid,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  return (
    <input
      className={cn(
        formControlClassName,
        className,
      )}
      aria-invalid={invalid ?? ariaInvalid}
      {...props}
    />
  );
}
