"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsCard } from "./SettingsCard";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { UserProfile } from "@/types/database";
import { FormFeedback } from "@/components/FormFeedback";

type AcademicProfileValues = {
  student_id: string;
  school: string;
  department: string;
  grade: string;
};

type EditableField = Omit<FieldInputField, "id"> & {
  id: keyof AcademicProfileValues;
};

const contactFields: FieldInputField[] = [
  {
    id: "real_name",
    label: "真實姓名",
    type: "text",
    disabled: true,
    hint: "如需修改請聯絡社團幹部",
  },
  {
    id: "phone",
    label: "手機號碼",
    type: "tel",
    disabled: true,
    hint: "如需修改請聯絡社團幹部",
  },
];

const academicFields: EditableField[] = [
  {
    id: "student_id",
    label: "學號",
    type: "text",
    placeholder: "請輸入您的學號",
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

function toFormValues(profile: UserProfile): AcademicProfileValues {
  return {
    student_id: profile.student_id ?? "",
    school: profile.school ?? "",
    department: profile.department ?? "",
    grade: profile.grade ?? "",
  };
}

function isValuesDirty(
  current: AcademicProfileValues,
  initial: AcademicProfileValues,
) {
  return (Object.keys(current) as (keyof AcademicProfileValues)[]).some(
    (key) => current[key] !== initial[key],
  );
}

type UserProfileSettingsCardProps = React.HTMLAttributes<HTMLDivElement> & {
  profile: UserProfile;
};

export const UserProfileSettingsCard = ({
  profile,
  className,
  ...rest
}: UserProfileSettingsCardProps) => {
  const router = useRouter();

  const initialValues = toFormValues(profile);
  const [values, setValues] = useState<AcademicProfileValues>(initialValues);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDirty = isValuesDirty(values, initialValues);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
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
      setSuccessMessage("學籍資訊已更新");
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "更新學籍資訊失敗，請稍後再試",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SettingsCard
      title="個人資料"
      description="查看聯絡資訊與修改學籍資訊"
      className={className}
      {...rest}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-(--foreground)">聯絡資訊</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {contactFields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={profile[field.id as keyof UserProfile] as string}
                onChange={() => {}}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 border-t border-(--border) pt-6">
          <p className="text-sm font-semibold text-(--foreground)">學籍資訊</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {academicFields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={handleChange}
              />
            ))}
          </div>
        </section>

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
            {isLoading ? "儲存中..." : "儲存修改"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
};
