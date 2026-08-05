"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsCard } from "./SettingsCard";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { UserAvatar } from "@/components/UserAvatar";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { User } from "@/types/database";
import { FormFeedback } from "@/components/FormFeedback";

type AccountFormValues = {
  name: string;
  avatar: string;
};

type UpdateAccountPayload = {
  name?: string;
  avatar?: string | null;
};
type AccountSettingsCardProps = React.HTMLAttributes<HTMLDivElement> & {
  user: User;
};

const nameField: FieldInputField = {
  id: "name",
  label: "帳號名稱",
  type: "text",
  autoComplete: "nickname",
  placeholder: "請輸入顯示名稱",
};

const avatarField: FieldInputField = {
  id: "avatar",
  label: "頭像",
  type: "url",
  placeholder: "https://example.com/avatar.png",
  hint: "目前支援圖片網址，建議使用正方形圖片",
};

const emailField: FieldInputField = {
  id: "email",
  label: "Email",
  type: "email",
  disabled: true,
  hint: "Email 為登入帳號，無法修改",
};

function toFormValues(user: User): AccountFormValues {
  return {
    name: user.name,
    avatar: user.avatar ?? "",
  };
}

export const AccountSettingsCard = ({
  user,
  className,
  ...rest
}: AccountSettingsCardProps) => {
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
    setValues((prev) => ({ ...prev, [name]: value }));
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

      setSuccessMessage("帳號資訊已更新");

      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "更新帳號資訊失敗，請稍後再試",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SettingsCard
      title="帳號資訊"
      description="修改顯示名稱與頭像，Email 僅供登入使用"
      className={className}
      {...rest}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col items-start gap-4 rounded-xl bg-(--secondary-background) p-4 sm:flex-row sm:items-center">
          <UserAvatar
            user={previewUser}
            className="size-16 shrink-0 rounded-2xl border border-(--border)"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-sm font-medium text-(--foreground)">
              {values.name.trim() || user.name}
            </p>
            <p className="text-sm text-(--muted)">頭像與名稱會在此預覽</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FieldInput
            field={nameField}
            value={values.name}
            onChange={handleChange}
          />
          <FieldInput
            field={avatarField}
            value={values.avatar}
            onChange={handleChange}
          />
        </div>

        <FieldInput field={emailField} value={user.email} onChange={() => {}} />

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
            {isLoading ? "儲存中..." : "儲存"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};
