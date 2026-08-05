"use client";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/utils/className";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { NEXT_PUBLIC_TURNSTILE_SITE_KEY } from "@/libs/env";

type RegisterFormValues = {
  email: string;
  name: string;
  real_name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type RegisterFieldId = Exclude<keyof RegisterFormValues, "acceptTerms">;

type RegisterField = Omit<FieldInputField, "id"> & {
  id: RegisterFieldId;
};

type FieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

const createInitialValues = (): RegisterFormValues => ({
  name: "",
  email: "",
  real_name: "",
  phone: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
});

const fields: RegisterField[] = [
  {
    id: "email",
    label: "Email",
    type: "email",
    required: true,
    autoComplete: "email",
    placeholder: "請輸入 Email",
  },
  {
    id: "name",
    label: "帳號名稱",
    type: "text",
    required: true,
    autoComplete: "name",
    placeholder: "請輸入您的帳號名稱",
  },
  {
    id: "real_name",
    label: "真實姓名",
    type: "text",
    required: true,
    autoComplete: "given-name",
    placeholder: "請輸入您的真實姓名",
  },
  {
    id: "phone",
    label: "電話",
    type: "tel",
    required: true,
    autoComplete: "tel",
    placeholder: "請輸入您的電話號碼",
  },
  {
    id: "password",
    label: "密碼",
    type: "password",
    required: true,
    autoComplete: "new-password",
    placeholder: "請輸入密碼",
    hint: "8～128 字元，含大小寫英文、數字與符號",
  },
  {
    id: "confirmPassword",
    label: "確認密碼",
    type: "password",
    required: true,
    autoComplete: "new-password",
    placeholder: "請再次輸入密碼",
  },
];

type RegisterFormProps = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit"
>;

export const RegisterForm = ({ className, ...rest }: RegisterFormProps) => {
  const router = useRouter();
  const acceptTermsId = useId();

  const [values, setValues] = useState<RegisterFormValues>(createInitialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  const turnstileRef = useRef<TurnstileInstance>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormError(null);

    setFieldErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  }

  function handleAcceptTermsChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { checked } = event.target;

    setValues((prev) => ({
      ...prev,
      acceptTerms: checked,
    }));

    setFormError(null);

    setFieldErrors((prev) => ({
      ...prev,
      acceptTerms: undefined,
    }));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (values.password !== values.confirmPassword) {
      errors.confirmPassword = "密碼與確認密碼不一致";
    }

    if (!values.acceptTerms) {
      errors.acceptTerms = "請先閱讀並同意服務條款與隱私權政策";
    }

    return errors;
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError(null);

    if (!turnstileToken) {
      setFormError("請完成安全驗證");
      return;
    }

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      await apiClient("/api/auth/register", {
        method: "POST",
        body: {
          name: values.name,
          email: values.email,
          password: values.password,
          turnstileToken,
        },
      });
      turnstileRef.current?.reset();
      setTurnstileToken("");
      router.push("/login");
    } catch (err) {
      turnstileRef.current?.reset();
      setTurnstileToken(""); // ← 新增：同步清空 state，避免帶著失效 token 再次送出
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
        {fields.map((field) => (
          <FieldInput
            key={field.id}
            field={{
              ...field,
              disabled: isLoading,
              error: fieldErrors[field.id],
            }}
            value={values[field.id]}
            onChange={handleChange}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={acceptTermsId}
          className="flex items-start gap-2 text-sm text-(--foreground)"
        >
          <input
            id={acceptTermsId}
            name="acceptTerms"
            type="checkbox"
            checked={values.acceptTerms}
            onChange={handleAcceptTermsChange}
            disabled={isLoading}
            required
            aria-invalid={!!fieldErrors.acceptTerms}
            aria-describedby={
              fieldErrors.acceptTerms ? `${acceptTermsId}-error` : undefined
            }
            className="mt-0.5 size-4 shrink-0 rounded border-(--border) accent-(--primary)"
          />

          <span>
            我已閱讀並同意
            <Link
              href="/terms"
              className="mx-1 text-(--primary) hover:underline"
            >
              服務條款
            </Link>
            與
            <Link
              href="/privacy"
              className="ml-1 text-(--primary) hover:underline"
            >
              隱私權政策
            </Link>
          </span>
        </label>

        {fieldErrors.acceptTerms && (
          <p
            id={`${acceptTermsId}-error`}
            role="alert"
            className="text-xs text-(--game-red)"
          >
            {fieldErrors.acceptTerms}
          </p>
        )}
      </div>
      <div className="flex justify-center">
        <Turnstile
          ref={turnstileRef}
          siteKey={NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          onSuccess={(token) => {
            setTurnstileToken(token);
            setFormError(null);
          }}
          onExpire={() => {
            setTurnstileToken("");
          }}
          onError={() => {
            setTurnstileToken("");
            setFormError("安全驗證失敗，請重新嘗試");
          }}
        />
      </div>
      <FormFeedback error={formError} />

      <div className="flex flex-col gap-4">
        <button
          type="submit"
          disabled={isLoading || !turnstileToken}
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
