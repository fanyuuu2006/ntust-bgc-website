import { cn } from "@/utils/className";
import { formControlClassName } from "./Input";

type SelectProps = React.ComponentProps<"select"> & {
  invalid?: boolean;
};

export function Select({
  className,
  invalid,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) {
  return (
    <select
      className={cn(formControlClassName, className)}
      aria-invalid={invalid ?? ariaInvalid}
      {...props}
    />
  );
}
