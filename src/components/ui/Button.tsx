import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/utils/className";

type ButtonVariant = "primary" | "outline" | "ghost" | "text" | "danger";
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
  outline: "btn outline",
  ghost: "btn ghost",
  text: "btn text",
  danger: "btn danger",
} as const;

const sizes = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-11 px-5 py-2.5 text-base",
  none: "",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    iconOnly = false,
    className,
    type = "button",
    disabled,
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        variants[variant],
        "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
        iconOnly && size !== "none" ? "size-10 p-0" : sizes[size],
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center gap-2",
          isLoading && "opacity-0",
        )}
      >
        {children}
      </span>
      {isLoading ? (
        <span
          aria-hidden="true"
          className="absolute size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
    </button>
  );
});

Button.displayName = "Button";

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
