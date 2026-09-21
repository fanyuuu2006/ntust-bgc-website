"use client";

import { useState } from "react";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { passwordConfirmationSchema } from "@/services/auth/auth.schema";

type PasswordValues = { newPassword: string; confirmPassword: string };
type PasswordField = Omit<FieldInputField, "id"> & { id: keyof PasswordValues };
type FieldErrors = Partial<Record<keyof PasswordValues, string>>;

const fields: PasswordField[] = [
  {
    id: "newPassword",
    label: "新密碼",
    type: "password",
    required: true,
    autoComplete: "new-password",
    hint: "8～128 字元，需包含大小寫英文、數字與符號",
    hintPlacement: "below",
  },
  {
    id: "confirmPassword",
    label: "確認新密碼",
    type: "password",
    required: true,
    autoComplete: "new-password",
  },
];

export function ResetPasswordForm({ invalidPassword }: { invalidPassword: boolean }) {
  const [values, setValues] = useState<PasswordValues>({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as keyof PasswordValues;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = passwordConfirmationSchema.safeParse(values);
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const nextErrors = Object.fromEntries(
        Object.entries(flattened)
          .filter((entry): entry is [string, string[]] => Boolean(entry[1]?.length))
          .map(([field, messages]) => [field, messages[0]]),
      ) as FieldErrors;
      setErrors(nextErrors);
      const firstInvalid = fields.find(({ id }) => nextErrors[id]);
      if (firstInvalid) requestAnimationFrame(() => document.getElementById(firstInvalid.id)?.focus());
      return;
    }

    setPending(true);
    setFormError(null);
    try {
      const response = await fetch("/api/auth/password-recovery/reset", {
        method: "POST",
        body: new URLSearchParams(parsed.data),
      });
      window.location.assign(response.url);
    } catch {
      setFormError("重設密碼失敗，請稍後再試。");
      setPending(false);
    }
  }

  return <form onSubmit={handleSubmit} noValidate aria-busy={pending || undefined} className="space-y-5">
    {fields.map((field) => (
      <FieldInput
        key={field.id}
        field={{ ...field, error: errors[field.id] }}
        value={values[field.id]}
        onChange={handleChange}
      />
    ))}
    <FormFeedback
      error={formError ?? (invalidPassword ? "密碼格式不正確，請重新輸入。" : null)}
    />
    <Button type="submit" variant="primary" disabled={pending} isLoading={pending} className="w-full">重設密碼</Button>
  </form>;
}
