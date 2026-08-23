"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormFeedback } from "@/components/FormFeedback";
import { apiClient } from "@/libs/api/client";
import type { MembershipRegisterKeyWithAcademicYear } from "@/services/memberships/memberships.types";
import type { AcademicYear } from "@/types/database";

type GenerateRegisterKeysResponse = {
  data: MembershipRegisterKeyWithAcademicYear[];
};

type RegisterKeyGenerateFormProps = {
  academicYears: AcademicYear[];
  defaultAcademicYearId?: string;
};

export function RegisterKeyGenerateForm({
  academicYears,
  defaultAcademicYearId,
}: RegisterKeyGenerateFormProps) {
  const router = useRouter();
  const [academicYearId, setAcademicYearId] = useState(
    defaultAcademicYearId ?? academicYears[0]?.id ?? "",
  );
  const [count, setCount] = useState("20");
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient<GenerateRegisterKeysResponse>(
        "/api/admin/members/register-keys",
        {
          method: "POST",
          body: {
            academic_year_id: academicYearId,
            count: Number(count),
          },
        },
      );
      const keys = response.data.map((registerKey) => registerKey.register_key);

      setGeneratedKeys(keys);
      setSuccess(`已產生 ${keys.length} 組社員註冊序號`);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "產生社員註冊序號失敗，請稍後再試";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyGeneratedKeys() {
    if (generatedKeys.length === 0) return;

    await navigator.clipboard.writeText(generatedKeys.join("\n"));
    setSuccess("已複製本次產生的所有序號");
  }

  return (
    <section className="card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-(--foreground)">
          產生社員註冊序號
        </h2>
        <p className="mt-1 text-sm leading-6 text-(--muted)">
          序號會綁定指定學年度，產生後可複製並發放給已完成線下繳費的學生。
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem_auto] lg:items-end"
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-(--foreground)">
          學年度
          <select
            value={academicYearId}
            onChange={(event) => setAcademicYearId(event.target.value)}
            disabled={isSubmitting}
            className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm outline-none focus:border-(--primary)"
          >
            {academicYears.map((academicYear) => (
              <option key={academicYear.id} value={academicYear.id}>
                {academicYear.year} 學年度
                {academicYear.is_current ? "（目前）" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-(--foreground)">
          產生數量
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(event) => setCount(event.target.value)}
            disabled={isSubmitting}
            className="rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm outline-none focus:border-(--primary)"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || !academicYearId}
          className="btn primary rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "產生中..." : "產生序號"}
        </button>
      </form>

      <FormFeedback className="mt-3" error={error} success={success} />

      {generatedKeys.length > 0 && (
        <div className="mt-4 rounded-lg border border-(--border) bg-(--secondary-background) p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-(--foreground)">
              本次產生序號
            </p>
            <button
              type="button"
              onClick={copyGeneratedKeys}
              className="btn outline rounded-md px-3 py-1.5 text-xs font-medium"
            >
              複製全部
            </button>
          </div>
          <pre className="mt-3 max-h-48 overflow-auto text-xs leading-6 break-all whitespace-pre-wrap text-(--foreground)">
            {generatedKeys.join("\n")}
          </pre>
        </div>
      )}
    </section>
  );
}
