"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils/className";
import { Input } from "@/components/ui/Input";
import { Field, getFieldDescribedBy } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export type FieldInputField = {
  id: string;
  label: string;
  hint?: string;
  type: React.HTMLInputTypeAttribute;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
};

type FieldInputProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> & {
  field: FieldInputField;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputClassName?: string;
};

export const FieldInput = ({
  field,
  value,
  onChange,
  className,
  inputClassName,
  ...rest
}: FieldInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordField = field.type === "password";
  const inputType = isPasswordField && isPasswordVisible ? "text" : field.type;

  const describedBy = getFieldDescribedBy(
    field.id,
    field.hint,
    field.error,
  );

  function togglePasswordVisibility() {
    setIsPasswordVisible((visible) => !visible);
  }

  return (
    <Field
      label={field.label}
      htmlFor={field.id}
      hint={field.hint}
      error={field.error}
      required={field.required}
      className={className}
      {...rest}
    >
      <div className="relative">
        <Input
          id={field.id}
          name={field.id}
          type={inputType}
          value={value}
          onChange={onChange}
          disabled={field.disabled}
          required={field.required}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          inputMode={field.inputMode}
          aria-required={field.required}
          invalid={Boolean(field.error)}
          aria-describedby={describedBy}
          className={cn(
            "bg-(--surface-subtle)",
            isPasswordField && "pr-10",
            inputClassName,
          )}
        />

        {isPasswordField && (
          <Button
            variant='text'
            size="none"
            onClick={togglePasswordVisibility}
            aria-label={isPasswordVisible ? "隱藏密碼" : "顯示密碼"}
            aria-pressed={isPasswordVisible}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-(--text-muted) hover:text-(--text-primary)"
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </Button>
        )}
      </div>

    </Field>
  );
};
