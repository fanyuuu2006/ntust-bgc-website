import { cn } from "@/utils/className";

type FieldProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  children,
  ...props
}: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      <label
        htmlFor={htmlFor}
        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm font-medium leading-snug text-(--text-primary)"
      >
        <span
          className={cn(
            required && "after:ml-0.5 after:text-(--status-danger) after:content-['*']",
          )}
        >
          {label}
        </span>
        {hint ? (
          <span
            id={hintId}
            className="min-w-0 flex-1 text-right text-xs font-normal text-(--text-muted) sm:text-left"
          >
            {hint}
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-(--status-danger)">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function getFieldDescribedBy(id: string, hint?: string, error?: string) {
  return [hint ? `${id}-hint` : undefined, error ? `${id}-error` : undefined]
    .filter(Boolean)
    .join(" ") || undefined;
}
