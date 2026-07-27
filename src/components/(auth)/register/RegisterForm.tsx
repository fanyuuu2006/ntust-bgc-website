"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/className";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { FieldInput } from "@/components/FieldInput";

type RegisterResponse = {
  data: {
    id: string;
    email: string;
    name: string;
  };
};

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialValues: RegisterFormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

type FieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

type RegisterFormProps = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
>;

export const RegisterForm = ({ className, ...rest }: RegisterFormProps) => {
  const router = useRouter();

  const [values, setValues] = useState<RegisterFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "密碼與確認密碼不一致";
    }

    return errors;
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      await apiClient<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: {
          name: values.name,
          email: values.email,
          password: values.password,
        },
      });

      router.push("/login");
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "註冊失敗，請稍後再試",
      );
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
            id: "name",
            label: "姓名",
            type: "text",
            required: true,
            autoComplete: "name",
            placeholder: "請輸入您的姓名",
          }}
          value={values.name}
          onChange={handleChange}
        />

        <FieldInput
          field={{
            id: "email",
            label: "Email",
            type: "email",
            required: true,
            autoComplete: "email",
            placeholder: "請輸入 Email",
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
            autoComplete: "new-password",
            placeholder: "請輸入密碼",
          }}
          value={values.password}
          onChange={handleChange}
        />

        <FieldInput
          field={{
            id: "confirmPassword",
            label: "確認密碼",
            type: "password",
            required: true,
            autoComplete: "new-password",
            placeholder: "請再次輸入密碼",
            error: fieldErrors.confirmPassword,
          }}
          value={values.confirmPassword}
          onChange={handleChange}
        />
      </div>

      {formError && (
        <p role="alert" className="text-sm text-(--game-red)">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="btn primary w-full rounded-lg py-2.5 text-sm font-medium sm:text-base"
        >
          {isLoading ? "建立中..." : "建立帳號"}
        </button>

        <p className="text-center text-sm text-(--muted)">
          已經有帳號？
          <Link href="/login" className="ml-1 text-(--primary) hover:underline">
            前往登入
          </Link>
        </p>
      </div>
    </form>
  );
};
