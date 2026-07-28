"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/className";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { FieldInput } from "@/components/FieldInput";
import type { User, UserProfile } from "@/types/database";

type UpdateProfileResponse = {
  data: UserProfile;
};

/**
 * 可編輯的個人資料欄位。
 */
type ProfileFormValues = {
  real_name: string;
  phone: string;
  student_id: string;
  school: string;
  department: string;
  grade: string;
};

type ProfileFormProps = {
  user: User;
  profile: UserProfile | null;
  className?: string;
};

function toFormValues(profile: UserProfile | null): ProfileFormValues {
  return {
    real_name: profile?.real_name ?? "",
    phone: profile?.phone ?? "",
    student_id: profile?.student_id ?? "",
    school: profile?.school ?? "",
    department: profile?.department ?? "",
    grade: profile?.grade ?? "",
  };
}

export const ProfileForm = ({ user, profile, className }: ProfileFormProps) => {
  const router = useRouter();

  const [values, setValues] = useState<ProfileFormValues>(
    toFormValues(profile),
  );
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
    setIsLoading(true);

    try {
      await apiClient<UpdateProfileResponse>("/api/users/me/profile", {
        method: "PATCH",
        body: values,
      });

      setSuccessMessage("個人資料已更新");
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "更新個人資料失敗，請稍後再試",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("card flex flex-col gap-6 p-6", className)}
    >
      <FieldInput
        field={{
          id: "email",
          label: "Email",
          type: "email",
          disabled: true,
          hint: "無法修改",
        }}
        value={user.email}
        onChange={() => {}}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldInput
          field={{
            id: "real_name",
            label: "真實姓名",
            type: "text",
            autoComplete: "name",
            placeholder: "請輸入真實姓名",
          }}
          value={values.real_name}
          onChange={handleChange}
        />

        <FieldInput
          field={{
            id: "phone",
            label: "手機號碼",
            type: "tel",
            autoComplete: "tel",
            placeholder: "請輸入手機號碼",
          }}
          value={values.phone}
          onChange={handleChange}
        />

        <FieldInput
          field={{
            id: "student_id",
            label: "學號",
            type: "text",
            placeholder: "請輸入學號",
          }}
          value={values.student_id}
          onChange={handleChange}
        />

        <FieldInput
          field={{
            id: "school",
            label: "學校",
            type: "text",
            placeholder: "請輸入學校",
          }}
          value={values.school}
          onChange={handleChange}
        />

        <FieldInput
          field={{
            id: "department",
            label: "系所",
            type: "text",
            placeholder: "請輸入系所",
          }}
          value={values.department}
          onChange={handleChange}
        />

        <FieldInput
          field={{
            id: "grade",
            label: "年級",
            type: "text",
            placeholder: "請輸入年級",
          }}
          value={values.grade}
          onChange={handleChange}
        />
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
          {isLoading ? "儲存中..." : "儲存修改"}
        </button>
      </div>
    </form>
  );
};
