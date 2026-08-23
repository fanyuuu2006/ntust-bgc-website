import { cn } from "@/utils/className";
type Props = React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "outline" | "danger";
};
const variants = {
  primary: "btn primary",
  secondary: "btn secondary",
  outline: "btn outline",
  danger: "btn danger",
} as const;
export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(variants[variant], "shrink-0 whitespace-nowrap", className)}
      {...props}
    />
  );
}
