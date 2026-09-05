"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { User } from "@/types/database";

type AccountFormValues = {
  name: string;
  avatar: string;
};

type UpdateAccountPayload = {
  name?: string;
  avatar?: string | null;
};

type AccountSettingsFormProps = React.HTMLAttributes<HTMLElement> & {
  user: User;
};

const nameField: FieldInputField = {
  id: "name",
  label: "使用者名稱",
  type: "text",
  autoComplete: "nickname",
  placeholder: "請輸入使用者名稱",
};

const avatarField: FieldInputField = {
  id: "avatar",
  label: "頭像圖片網址",
  type: "url",
  placeholder: "https://example.com/avatar.png",
  hint: "目前支援圖片網址，建議使用正方形圖片",
};

function toFormValues(user: User): AccountFormValues {
  return {
    name: user.name,
    avatar: user.avatar ?? "",
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

  const isDirty =
    values.name.trim() !== user.name ||
    values.avatar.trim() !== (user.avatar ?? "");

  const previewUser = useMemo(
    () => ({
      id: user.id,
      email: user.email,
      name: values.name.trim() || user.name,
      avatar: values.avatar.trim() || null,
    }),
    [user.id, user.email, user.name, values.name, values.avatar],
  );

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
        avatar: values.avatar.trim() || null,
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
    <section className={className} {...rest} aria-labelledby="account-settings-title">
      <div>
        <h3 id="account-settings-title" className="font-semibold text-(--text-primary)">
          帳號資料
        </h3>
        <p className="mt-1 text-sm text-(--text-muted)">
          管理網站上的使用者名稱與頭像。
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <div className="flex min-w-0 items-center gap-3 rounded-xl bg-(--surface-subtle) p-3 sm:p-4">
          <UserAvatar
            user={previewUser}
            className="size-14 shrink-0 rounded-xl border border-(--border-default) sm:size-16"
          />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-(--text-primary)">
              {values.name.trim() || user.name}
            </p>
            <p className="mt-0.5 text-xs text-(--text-muted)">
              頭像與使用者名稱預覽
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldInput
            field={{ ...nameField, disabled: isLoading }}
            value={values.name}
            onChange={handleChange}
          />
          <FieldInput
            field={{ ...avatarField, disabled: isLoading }}
            value={values.avatar}
            onChange={handleChange}
          />
        </div>

        <div
          aria-readonly="true"
          aria-labelledby="settings-email-label"
          aria-describedby="settings-email-hint"
          className="min-w-0 rounded-xl border border-(--border-muted) bg-(--surface-subtle) px-3 py-3"
        >
          <p id="settings-email-label" className="text-sm font-medium text-(--text-primary)">
            Email
          </p>
          <p className="mt-1 break-all text-sm text-(--text-secondary)" title={user.email}>
            {user.email}
          </p>
          <p id="settings-email-hint" className="mt-1 text-xs text-(--text-muted)">
            Email 為登入帳號，目前無法修改
          </p>
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
