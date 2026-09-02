"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { FieldInput } from "@/components/FieldInput";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiClient } from "@/libs/api/client";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";

type ActivateMembershipResponse = {
  data: MembershipWithAcademicYear;
};

export function MembershipActivationForm({
  academicYearLabel,
}: {
  academicYearLabel?: string;
}) {
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
        `已完成 ${response.data.academic_year?.year ?? "本"} 學年度入社。`,
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "完成入社失敗，請稍後再試。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card surface="elevated" className="p-5 sm:p-6">
      <form
        onSubmit={handleSubmit}
        aria-busy={isSubmitting || undefined}
        className="flex flex-col gap-4"
      >
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-(--interactive-primary)">
            <KeyRound aria-hidden="true" className="size-4" />
            社員資格
          </p>
          <h2 className="text-xl font-semibold text-(--text-primary)">
            尚未完成 {academicYearLabel ?? "本"} 學年度入社
          </h2>
          <p className="text-sm leading-6 text-(--text-muted)">
            取得社員註冊序號後，在此輸入即可完成入社。
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

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          className="self-start"
        >
          {isSubmitting ? "完成入社中" : "完成入社"}
        </Button>
      </form>
    </Card>
  );
}
