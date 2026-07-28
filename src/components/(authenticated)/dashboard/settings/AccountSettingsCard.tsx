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
  hint: "顯示名稱將會在留言、討論區、個人主頁等地方顯示",
};

const avatarField: FieldInputField = {
  id: "avatar",
  label: "頭像網址",
  type: "url",
  placeholder: "https://example.com/avatar.png",
  hint: "目前僅支援貼上圖片網址",
};

export const AccountSettingsCard = ({ user }: AccountSettingsCardProps) => {
  const router = useRouter();

  const [values, setValues] = useState<AccountFormValues>({
    name: user.name,
    avatar: user.avatar ?? "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDirty =
    values.name !== user.name || values.avatar !== (user.avatar ?? "");

  // UserAvatar 需要完整的 user 物件（id/name/email/avatar），
  // 這裡用表單目前輸入的值覆蓋 avatar/name，讓預覽即時反映編輯中的內容
  const previewUser = useMemo(
    () => ({
      id: user.id,
      email: user.email,
      name: values.name || user.name,
      avatar: values.avatar || user.avatar,
    }),
    [user, values.name, values.avatar],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
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
    <SettingsCard title="帳號資訊" description="顯示名稱、頭像與登入 Email">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <UserAvatar user={previewUser} className="size-16 rounded-2xl" />
          <p className="text-sm text-(--muted)">
            更新頭像網址後儲存即可套用新頭像
          </p>
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

        <FieldInput
          field={{
            id: "email",
            label: "Email",
            type: "email",
            disabled: true,
            hint: "登入帳號，無法修改",
          }}
          value={user.email}
          onChange={() => {}}
        />

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
