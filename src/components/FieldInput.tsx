"use client";

import { useState } from "react";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import { cn } from "@/utils/className";

export type FieldInputField = {
  id: string;
  label: string;
  hint?: string;
  type: React.HTMLInputTypeAttribute;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  error?: string;
};

type FieldInputProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> & {
  field: FieldInputField;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const labelClassName = "text-sm font-medium text-(--foreground)";
const requiredMarkClassName =
  "after:ml-0.5 after:text-(--game-red) after:content-['*']";

const inputBaseClassName = cn(
  "w-full rounded-lg border border-(--border) bg-(--secondary-background)",
  "px-3 py-2 text-sm text-(--foreground) outline-none",
  "placeholder:text-(--muted)",
  "focus:border-(--primary)",
  "disabled:cursor-not-allowed disabled:bg-(--secondary-background) disabled:text-(--muted)",
);

export const FieldInput = ({
  field,
  value,
  onChange,
  className,
  ...rest
}: FieldInputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPasswordField = field.type === "password";
  const inputType = isPasswordField && isPasswordVisible ? "text" : field.type;

  const hintId = field.hint ? `${field.id}-hint` : undefined;
  const errorId = field.error ? `${field.id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  function togglePasswordVisibility() {
    setIsPasswordVisible((visible) => !visible);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...rest}>
      <label
        htmlFor={field.id}
        className={cn(labelClassName, {
          [requiredMarkClassName]: field.required,
        })}
      >
        {field.label}
        {field.hint && (
          <span id={hintId} className="ml-2 text-xs font-normal text-(--muted)">
            {field.hint}
          </span>
        )}
      </label>

      <div className="relative">
        <input
          id={field.id}
          name={field.id}
          type={inputType}
          value={value}
          onChange={onChange}
          disabled={field.disabled}
          required={field.required}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          aria-required={field.required}
          aria-invalid={!!field.error}
          aria-describedby={describedBy}
          className={cn(inputBaseClassName, {
            "pr-10": isPasswordField,
            "border-(--game-red)": field.error,
          })}
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            aria-label={isPasswordVisible ? "隱藏密碼" : "顯示密碼"}
            aria-pressed={isPasswordVisible}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted)"
          >
            {isPasswordVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          </button>
        )}
      </div>

      {field.error && (
        <p id={errorId} role="alert" className="text-xs text-(--game-red)">
          {field.error}
        </p>
      )}
    </div>
  );
};
