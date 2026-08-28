import { cn } from "@/utils/className";
import { formControlClassName } from "./Input";

type TextareaProps = React.ComponentProps<"textarea"> & {
  invalid?: boolean;
};

export function Textarea({
  className,
  invalid,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={cn(formControlClassName, "min-h-24 resize-y", className)}
      aria-invalid={invalid ?? ariaInvalid}
      {...props}
    />
  );
}
