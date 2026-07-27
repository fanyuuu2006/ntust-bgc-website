"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/className";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { FieldInput } from "@/components/FieldInput";

type LoginResponse = {
  data: {
    id: string;
    email: string;
    name: string;
  };
};

type LoginFormValues = {
  email: string;
  password: string;
};

const initialValues: LoginFormValues = {
  email: "",
  password: "",
};

type LoginFormProps = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
>;

export const LoginForm = ({ className, ...rest }: LoginFormProps) => {
  const router = useRouter();

  const [values, setValues] = useState<LoginFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      await apiClient<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: values,
      });

      router.refresh();
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
      className={cn("flex flex-col gap-6", className)}
      {...rest}
    >
      <div className="flex flex-col gap-4">
        <FieldInput
          field={{
            id: "email",
            label: "Email",
            type: "email",
            required: true,
            autoComplete: "email",
          }}
          value={values.email}
          onChange={handleChange}
        />

        <FieldInput
          field={{
            id: "password",
            label: "密碼",
            type: "password",
            required: true,
            autoComplete: "current-password",
          }}
          value={values.password}
          onChange={handleChange}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-(--game-red)">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="btn primary w-full rounded-lg py-2.5 text-sm font-medium sm:text-base"
        >
          {isLoading ? "登入中..." : "登入"}
        </button>

        <p className="text-center text-sm text-(--muted)">
          還沒有帳號？
          <Link
            href="/register"
            className="ml-1 text-(--primary) hover:underline"
          >
            前往註冊
          </Link>
        </p>
      </div>
    </form>
  );
};
