"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { UserProfile } from "@/types/database";

type ProfileFormValues = Pick<
  UserProfile,
  "real_name" | "phone" | "student_id" | "school" | "department" | "grade"
>;

type ProfileField = Omit<FieldInputField, "id"> & {
  id: keyof ProfileFormValues;
};

const fields: ProfileField[] = [
  {
    id: "real_name",
    label: "真實姓名",
    type: "text",
    autoComplete: "name",
    placeholder: "請輸入真實姓名",
  },
  {
    id: "phone",
    label: "手機號碼",
    type: "tel",
    autoComplete: "tel",
    inputMode: "tel",
    placeholder: "請輸入手機號碼",
  },
  {
    id: "student_id",
    label: "學號",
    type: "text",
    placeholder: "請輸入學號",
  },
  {
    id: "school",
    label: "學校",
    type: "text",
    placeholder: "例如：國立臺灣科技大學",
  },
  {
    id: "department",
    label: "系所",
    type: "text",
    placeholder: "例如：資訊管理、企業管理",
  },
  {
    id: "grade",
    label: "年級",
    type: "text",
    placeholder: "例如：大一、碩二",
  },
];

function toFormValues(profile: UserProfile): ProfileFormValues {
  return {
    real_name: profile.real_name,
    phone: profile.phone,
    student_id: profile.student_id ?? "",
    school: profile.school ?? "",
    department: profile.department ?? "",
    grade: profile.grade ?? "",
  };
}

function isDirty(current: ProfileFormValues, initial: ProfileFormValues) {
  return (Object.keys(current) as (keyof ProfileFormValues)[]).some(
    (key) => current[key] !== initial[key],
  );
}

export function ProfileSettingsForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const initialValues = toFormValues(profile);
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasChanges = isDirty(values, initialValues);

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
    setIsLoading(true);

    try {
      await apiClient("/api/users/me/profile", {
        method: "PATCH",
        body: values,
      });
      setSuccessMessage("個人資料已更新");
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "更新個人資料失敗，請稍後再試",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-labelledby="profile-settings-title">
      <div>
        <h3 id="profile-settings-title" className="font-semibold text-(--text-primary)">
          個人資料
        </h3>
        <p className="mt-1 text-sm text-(--text-muted)">
          更新聯絡方式與學籍資料。
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={isLoading || undefined}
        className="mt-4 flex flex-col gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={{ ...field, disabled: isLoading }}
              value={values[field.id] ?? ""}
              onChange={handleChange}
            />
          ))}
        </div>

        <FormFeedback error={formError} success={successMessage} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={handleReset}
            disabled={isLoading || !hasChanges}
            variant="outline"
            className="w-full sm:w-auto"
          >
            重設
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !hasChanges}
            isLoading={isLoading}
            className="w-full sm:w-auto"
          >
            儲存個人資料
          </Button>
        </div>
      </form>
    </section>
  );
}
