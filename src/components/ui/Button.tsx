import Link from "next/link";
import { cn } from "@/utils/className";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "none";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  iconOnly?: boolean;
};

type ButtonLinkProps = Omit<React.ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

const variants = {
  primary: "btn primary",
  secondary: "btn secondary",
  outline: "btn outline",
  ghost: "btn ghost",
  danger: "btn danger",
} as const;

const sizes = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-11 px-5 py-2.5 text-base",
  none: "",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  iconOnly = false,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        variants[variant],
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
        iconOnly && size !== "none" ? "size-10 p-0" : sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        variants[variant],
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
