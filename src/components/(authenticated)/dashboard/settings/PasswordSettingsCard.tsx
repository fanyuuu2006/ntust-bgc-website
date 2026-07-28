"use client";

import { useMemo, useState } from "react";
import { SettingsCard } from "./SettingsCard";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { FormFeedback } from "../../../FormFeedback";

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
    hint: "需包含大小寫英文字母、數字與特殊符號（8～128 字元）",
  },
  {
    id: "confirmPassword",
    label: "確認新密碼",
    type: "password",
    autoComplete: "new-password",
    placeholder: "請再次輸入新密碼",
  },
];

type PasswordSettingsCardProps = React.HTMLAttributes<HTMLDivElement>;

export const PasswordSettingsCard = (props: PasswordSettingsCardProps) => {
  const [values, setValues] = useState<PasswordFormValues>(initialValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDirty =
    values.currentPassword !== "" ||
    values.newPassword !== "" ||
    values.confirmPassword !== "";

  // 送出期間鎖住所有輸入框，避免畫面顯示值與已送出的請求內容不同步
  const fields = useMemo(
    () => baseFields.map((field) => ({ ...field, disabled: isLoading })),
    [isLoading],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
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
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "更新密碼失敗，請稍後再試",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SettingsCard
      title="安全性"
      description="定期更換密碼可以降低帳號被盜用的風險"
      {...props}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={handleChange}
              className={
                field.id === "currentPassword" ? "sm:col-span-2" : undefined
              }
            />
          ))}
        </div>

        <FormFeedback error={formError} success={successMessage} />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading || !isDirty}
            className="btn outline w-full rounded-lg px-6 py-2.5 text-sm font-medium sm:w-auto sm:text-base"
          >
            重設
          </button>

          <button
            type="submit"
            disabled={isLoading || !isDirty}
            aria-busy={isLoading}
            className="btn primary w-full rounded-lg px-6 py-2.5 text-sm font-medium sm:w-auto sm:text-base"
          >
            {isLoading ? "更新中..." : "更新密碼"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};
