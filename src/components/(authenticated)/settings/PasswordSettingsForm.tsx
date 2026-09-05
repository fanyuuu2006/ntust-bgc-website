"use client";

import { useMemo, useState } from "react";

import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PasswordFieldId = keyof PasswordFormValues;
type PasswordField = Omit<FieldInputField, "id"> & { id: PasswordFieldId };

const initialValues: PasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const baseFields: PasswordField[] = [
  {
    id: "currentPassword",
    label: "目前密碼",
    type: "password",
    autoComplete: "current-password",
    placeholder: "請輸入目前使用的密碼",
  },
  {
    id: "newPassword",
    label: "新密碼",
    type: "password",
    autoComplete: "new-password",
    placeholder: "請輸入新密碼",
    hint: "8～128 字元，含大小寫英文、數字與符號",
  },
  {
    id: "confirmPassword",
    label: "確認新密碼",
    type: "password",
    autoComplete: "new-password",
    placeholder: "請再次輸入新密碼",
  },
];

export function PasswordSettingsForm() {
  const [values, setValues] = useState<PasswordFormValues>(initialValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isDirty = Object.values(values).some(Boolean);
  const fields = useMemo(
    () => baseFields.map((field) => ({ ...field, disabled: isLoading })),
    [isLoading],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFormError(null);
    setSuccessMessage(null);
  }

  function handleReset() {
    setValues(initialValues);
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (values.newPassword !== values.confirmPassword) {
      setFormError("兩次輸入的新密碼不一致");
      return;
    }

    setIsLoading(true);
    try {
      await apiClient("/api/auth/password", { method: "PATCH", body: values });
      setSuccessMessage("密碼已更新，下次登入請使用新密碼");
      setValues(initialValues);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "更新密碼失敗，請稍後再試",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-labelledby="password-settings-title">
      <div>
        <h3 id="password-settings-title" className="font-semibold text-(--text-primary)">
          變更密碼
        </h3>
        <p className="mt-1 text-sm text-(--text-muted)">
          使用目前密碼驗證後設定新密碼。
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={handleChange}
              className={field.id === "currentPassword" ? "sm:col-span-2" : undefined}
            />
          ))}
        </div>

        <FormFeedback error={formError} success={successMessage} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={handleReset}
            disabled={isLoading || !isDirty}
            variant="outline"
            className="w-full sm:w-auto"
          >
            重設
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !isDirty}
            isLoading={isLoading}
            className="w-full sm:w-auto"
          >
            更新密碼
          </Button>
        </div>
      </form>
    </section>
  );
}
