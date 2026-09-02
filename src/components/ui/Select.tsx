import { cn } from "@/utils/className";
import { formControlClassName } from "./Input";

type SelectProps = React.ComponentProps<"select"> & {
  invalid?: boolean;
  focusOwner?: "self" | "parent";
};

export function Select({
  className,
  invalid,
  focusOwner = "self",
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) {
  return (
    <select
      data-focus-owner={focusOwner}
      className={cn("ui-select", formControlClassName, className)}
      aria-invalid={invalid ?? ariaInvalid}
      {...props}
    />
  );
}
