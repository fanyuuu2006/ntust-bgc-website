"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FieldInput } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { apiClient } from "@/libs/api/client";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";

type ActivateMembershipResponse = {
  data: MembershipWithAcademicYear;
};

export function MembershipActivationForm() {
  const router = useRouter();
  const [registerKey, setRegisterKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient<ActivateMembershipResponse>(
        "/api/memberships/activate",
        {
          method: "POST",
          body: { register_key: registerKey },
        },
      );

      setRegisterKey("");
      setSuccess(
        `${response.data.academic_year?.year ?? ""} 學年度社員資格啟用成功`,
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "啟用社員資格失敗，請稍後再試",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-4 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-(--foreground)">
          啟用社員資格
        </h2>
        <p className="text-sm leading-6 text-(--muted)">
          如果你已完成本學年度社費繳交，請輸入幹部提供的社員註冊序號。
        </p>
      </div>

      <FieldInput
        field={{
          id: "register_key",
          label: "社員註冊序號",
          type: "text",
          required: true,
          placeholder: "114NTUSTBGC001A1B2C3D4",
          autoComplete: "off",
          disabled: isSubmitting,
        }}
        value={registerKey}
        onChange={(event) => setRegisterKey(event.target.value.toUpperCase())}
      />

      <FormFeedback error={error} success={success} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn primary rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "啟用中..." : "啟用社員資格"}
      </button>
    </form>
  );
}
