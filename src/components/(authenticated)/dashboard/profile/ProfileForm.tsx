"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils/className";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { FieldInput, type FieldInputField } from "@/components/FieldInput";
import type { User, UserProfile } from "@/types/database";

type UpdateProfileResponse = {
  data: UserProfile;
};

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

type EditableField = Omit<FieldInputField, "id"> & {
  id: keyof ProfileFormValues;
};

const basicFields: EditableField[] = [
  {
    id: "real_name",
    label: "真實姓名",
    type: "text",
    autoComplete: "name",
    placeholder: "請輸入您的真實姓名",
    hint: "用於社團確認與辨識社員資料",
  },
  {
    id: "phone",
    label: "手機號碼",
    type: "tel",
    autoComplete: "tel",
    placeholder: "請輸入您的手機號碼",
    hint: "例如：0912345678",
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
    placeholder: "請輸入您的學校",
    hint: "例如：國立臺灣科技大學",
  },
  {
    id: "department",
    label: "系所",
    type: "text",
    placeholder: "請輸入您的系所",
    hint: "只需系所名稱，例如：資訊管理、企業管理",
  },
  {
    id: "grade",
    label: "年級",
    type: "text",
    placeholder: "請輸入您的年級",
    hint: "例如：大一、碩二",
  },
];

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

  function handleReset() {
    setValues(toFormValues(profile));
    setFormError(null);
    setSuccessMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await apiClient<UpdateProfileResponse>("/api/users/me/profile", {
        method: profile ? "PATCH" : "POST",
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
      className={cn("card flex flex-col gap-8 p-6", className)}
    >
      <FormSection title="帳號資訊">
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
      </FormSection>

      <FormSection title="基本資料">
        <div className="grid gap-4 sm:grid-cols-2">
          {basicFields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={handleChange}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title="學籍資料">
        <div className="grid gap-4 sm:grid-cols-2">
          {academicFields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={handleChange}
            />
          ))}
        </div>
      </FormSection>

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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="btn outline rounded-lg px-6 py-2.5 text-sm font-medium sm:text-base"
        >
          重設
        </button>

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

type FormSectionProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
};
const FormSection = ({
  children,
  title,
  className,
  ...rest
}: FormSectionProps) => (
  <div className={cn("flex flex-col gap-4", className)} {...rest}>
    <h2 className="text-sm font-semibold text-(--foreground)">{title}</h2>
    {children}
  </div>
);
