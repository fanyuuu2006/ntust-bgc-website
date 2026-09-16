"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { AvatarSettingsSection } from "@/components/(authenticated)/settings/AvatarSettingsSection";
import { Button } from "@/components/ui/Button";
import { ResendEmailVerificationButton } from "@/components/(auth)/email-verification/ResendEmailVerificationButton";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { User } from "@/types/database";

type AccountFormValues = {
  name: string;
};

type UpdateAccountPayload = {
  name?: string;
};

type AccountSettingsFormProps = React.HTMLAttributes<HTMLElement> & {
  user: User;
};

const nameField: FieldInputField = {
  id: "name",
  required: true,
  label: "使用者名稱",
  type: "text",
  autoComplete: "nickname",
  placeholder: "請輸入使用者名稱",
};

function toFormValues(user: User): AccountFormValues {
  return {
    name: user.name,
  };
}

export function AccountSettingsForm({
  user,
  className,
  ...rest
}: AccountSettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<AccountFormValues>(() =>
    toFormValues(user),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDirty = values.name.trim() !== user.name;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setFormError(null);
    setSuccessMessage(null);
  }

  function handleReset() {
    setValues(toFormValues(user));
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const payload: UpdateAccountPayload = {
        name: values.name.trim(),
      };

      await apiClient("/api/users/me/account", {
        method: "PATCH",
        body: payload,
      });
      setSuccessMessage("帳號資料已更新");
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "更新帳號資料失敗，請稍後再試",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      className={className}
      {...rest}
      aria-labelledby="account-settings-title"
    >
      <div>
        <h3
          id="account-settings-title"
          className="font-semibold text-(--text-primary)"
        >
          帳號資料
        </h3>
        <p className="mt-1 text-sm text-(--text-muted)">
          管理網站上的使用者名稱與頭像。這兩項會顯示在公開個人頁面，請勿填入不希望公開的個資。公開頁也會顯示社員／幹部身份標籤與部分社團足跡摘要。
        </p>
      </div>

      <div className="mt-4">
        <AvatarSettingsSection user={user} />
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={isLoading || undefined}
        className="mt-5 flex flex-col gap-4 border-t border-(--border-default) pt-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInput
            field={{ ...nameField, disabled: isLoading }}
            value={values.name}
            onChange={handleChange}
          />
        </div>

        <div
          aria-readonly="true"
          aria-labelledby="settings-email-label"
          aria-describedby="settings-email-hint"
          className="min-w-0 rounded-xl border border-(--border-muted) bg-(--surface-subtle) px-3 py-3"
        >
          <p
            id="settings-email-label"
            className="text-sm font-medium text-(--text-primary)"
          >
            Email
          </p>
          <p
            className="mt-1 break-all text-sm text-(--text-secondary)"
            title={user.email}
          >
            {user.email}
          </p>
          <p
            id="settings-email-hint"
            className="mt-1 text-xs text-(--text-muted)"
          >
            Email 為登入帳號，目前無法修改
          </p>
          <p className="mt-2 text-xs font-medium text-(--text-secondary)">
            {user.email_verified_at ? "Email 已驗證" : "Email 尚未驗證"}
          </p>
          {!user.email_verified_at && (
            <div className="mt-3">
              <ResendEmailVerificationButton />
            </div>
          )}
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
            儲存帳號資料
          </Button>
        </div>
      </form>
    </section>
  );
}
