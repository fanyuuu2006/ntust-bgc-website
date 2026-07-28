"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsCard } from "./SettingsCard";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { UserAvatar } from "@/components/UserAvatar";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { User } from "@/types/database";

type AccountFormValues = {
  name: string;
  avatar: string;
};

type AccountSettingsCardProps = {
  user: User;
};

const nameField: FieldInputField = {
  id: "name",
  label: "顯示名稱",
  type: "text",
  autoComplete: "nickname",
  placeholder: "請輸入顯示名稱",
  hint: "將顯示於留言、討論區與個人頁面",
};

const avatarField: FieldInputField = {
  id: "avatar",
  label: "頭像圖片網址",
  type: "url",
  placeholder: "https://example.com/avatar.png",
  hint: "目前支援圖片網址，建議使用正方形圖片",
};

const emailField: FieldInputField = {
  id: "email",
  label: "登入 Email",
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

export const AccountSettingsCard = ({ user }: AccountSettingsCardProps) => {
  const router = useRouter();

  const [values, setValues] = useState<AccountFormValues>(() =>
    toFormValues(user),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDirty =
    values.name !== user.name || values.avatar !== (user.avatar ?? "");

  // UserAvatar 需要完整的 user 物件，這裡用表單目前輸入的值覆蓋
  // avatar/name，讓左側預覽即時反映編輯中、尚未送出的內容
  const previewUser = useMemo(
    () => ({
      id: user.id,
      email: user.email,
      name: values.name.trim() || user.name,
      avatar: values.avatar.trim() || user.avatar,
    }),
    [user, values.name, values.avatar],
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
      await apiClient("/api/users/me/account", {
        method: "PATCH",
        body: values,
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
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <UserAvatar
            user={previewUser}
            className="size-16 shrink-0 rounded-2xl"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-medium text-(--foreground)">
              {values.name.trim() || user.name}
            </p>
            <p className="text-sm text-(--muted)">修改後會即時預覽</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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

        <div aria-live="polite" className="min-h-5">
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
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading || !isDirty}
            className="btn outline rounded-lg px-6 py-2.5 text-sm font-medium sm:text-base"
          >
            重設
          </button>

          <button
            type="submit"
            disabled={isLoading || !isDirty}
            aria-busy={isLoading}
            className="btn primary rounded-lg px-6 py-2.5 text-sm font-medium sm:text-base"
          >
            {isLoading ? "儲存中..." : "儲存"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};
