"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import type { MembershipRegisterKeyWithAcademicYear } from "@/services/memberships/memberships.types";
import type { AcademicYear } from "@/types/database";

type RegisterKeyGenerateFormProps = {
  academicYears: AcademicYear[];
  defaultAcademicYearId?: string;
};

export function RegisterKeyGenerateForm({
  academicYears,
  defaultAcademicYearId,
}: RegisterKeyGenerateFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [academicYearId, setAcademicYearId] = useState(
    defaultAcademicYearId ?? academicYears[0]?.id ?? "",
  );
  const [count, setCount] = useState("20");
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    if (!busy) {
      setOpen(false);
      setError(null);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await apiClient<{
        data: MembershipRegisterKeyWithAcademicYear[];
      }>("/api/admin/members/register-keys", {
        method: "POST",
        body: { academic_year_id: academicYearId, count: Number(count) },
      });
      setGeneratedKeys(response.data.map((item) => item.register_key));
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "產生社員註冊碼失敗，請稍後再試。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        className="rounded-lg"
        onClick={() => {
          setGeneratedKeys([]);
          setError(null);
          setOpen(true);
        }}
      >
        + 產生社員註冊碼
      </Button>

      <Modal
        open={open}
        onClose={close}
        title="產生社員註冊碼"
        description="選擇學年度與數量後，系統會產生僅能使用一次的社員註冊碼。"
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="學年度" htmlFor="register-key-year">
            <Select
              id="register-key-year"
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
              disabled={busy}
            >
              <option value="">請選擇學年度</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year} 學年度{year.is_current ? "（目前）" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="產生數量" htmlFor="register-key-count">
            <Input
              id="register-key-count"
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              disabled={busy}
            />
          </Field>
          <FormFeedback error={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={close}>
              取消
            </Button>
            <Button disabled={busy || !academicYearId} isLoading={busy}>
              {busy ? "產生中…" : "產生"}
            </Button>
          </div>
        </form>
      </Modal>

      {generatedKeys.length > 0 ? (
        <div className="rounded-xl border border-(--border-default) bg-(--surface-subtle) p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-(--text-primary)">
              本次產生的社員註冊碼
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(generatedKeys.join("\n"));
              }}
            >
              複製全部
            </Button>
          </div>
          <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs leading-6">
            {generatedKeys.join("\n")}
          </pre>
        </div>
      ) : null}
    </>
  );
}
