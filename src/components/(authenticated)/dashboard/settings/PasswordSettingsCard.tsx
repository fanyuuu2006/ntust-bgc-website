"use client";

import { useState } from "react";
import { SettingsCard } from "./SettingsCard";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialValues: PasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const fields: FieldInputField[] = [
  {
    id: "currentPassword",
    label: "目前密碼",
    type: "password",
    autoComplete: "current-password",
  },
  {
    id: "newPassword",
    label: "新密碼",
    type: "password",
    autoComplete: "new-password",
    hint: "至少 8 個字元",
  },
  {
    id: "confirmPassword",
    label: "確認新密碼",
    type: "password",
    autoComplete: "new-password",
  },
];

export const PasswordSettingsCard = () => {
  const [values, setValues] = useState<PasswordFormValues>(initialValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
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
      setSuccessMessage("密碼已更新");
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
    <SettingsCard title="安全性" description="定期更換密碼可提升帳號安全">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id as keyof PasswordFormValues]}
              onChange={handleChange}
            />
          ))}
        </div>

        {formError && (
          <p role="alert" className="text-sm text-(--game-red)">
            {formError}
          </p>
        )}
        {successMessage && (
          <p role="status" className="text-sm text-(--secondary)">
            {successMessage}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="btn primary rounded-lg px-6 py-2.5 text-sm font-medium sm:text-base"
          >
            {isLoading ? "更新中..." : "更新密碼"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};
