"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/className";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { getSafeReturnPath } from "@/utils/redirect";

type LoginFormValues = {
  email: string;
  password: string;
};

const createInitialValues = (): LoginFormValues => ({
  email: "",
  password: "",
});

const fields: FieldInputField[] = [
  {
    id: "email",
    label: "Email",
    type: "email",
    required: true,
    autoComplete: "email",
    inputMode: "email",
    placeholder: "請輸入 Email",
  },
  {
    id: "password",
    label: "密碼",
    type: "password",
    required: true,
    autoComplete: "current-password",
    placeholder: "請輸入密碼",
  },
];

type LoginFormProps = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
>;

export const LoginForm = ({ className, ...rest }: LoginFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReturnTo = searchParams.get("returnTo");
  const returnTo = getSafeReturnPath(rawReturnTo);
  const registerHref = rawReturnTo === returnTo
    ? `/register?returnTo=${encodeURIComponent(returnTo)}`
    : "/register";
  const [values, setValues] = useState<LoginFormValues>(createInitialValues);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError(null);
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      await apiClient("/api/auth/login", {
        method: "POST",
        body: values,
      });

      router.replace(returnTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "登入失敗，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={isLoading || undefined}
      className={cn("flex flex-col gap-6", className)}
      {...rest}
    >
      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <FieldInput
            key={field.id}
            field={{
              ...field,
              disabled: isLoading,
            }}
            value={values[field.id as keyof LoginFormValues]}
            onChange={handleChange}
          />
        ))}
      </div>

      <FormFeedback error={error} />

      <div className="flex flex-col gap-4">
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          isLoading={isLoading}
          className="w-full py-2.5 sm:text-base"
        >
          {isLoading ? "登入中..." : "登入"}
        </Button>

        <p className="text-center text-sm text-(--text-muted)">
          還沒有帳號？
          <Link
            href={registerHref}
            className="ml-1 text-(--interactive-primary) hover:underline"
          >
            前往註冊
          </Link>
        </p>
      </div>
    </form>
  );
};
