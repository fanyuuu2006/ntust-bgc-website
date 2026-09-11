"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AdminUserPicker } from "@/components/(admin)/admin/users/AdminUserPicker";
import { apiClient } from "@/libs/api/client";
import type { AcademicYear } from "@/types/database";

export function OfficerActions({ years }: { years: AcademicYear[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerResetKey, setPickerResetKey] = useState(0);
  const [values, setValues] = useState({
    user_id: "",
    academic_year_id: years.find((year) => year.is_current)?.id ?? "",
    title: "",
  });

  const closeForm = () => {
    if (busy) return;

    setError(null);
    setOpen(false);
  };

  const createOfficer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      await apiClient("/api/admin/officers", { method: "POST", body: values });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "新增幹部職位失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setError(null);
          setValues({
            user_id: "",
            academic_year_id: years.find((year) => year.is_current)?.id ?? "",
            title: "",
          });
          setPickerResetKey((current) => current + 1);
          setOpen(true);
        }}
      >
        新增幹部職位
      </Button>

      <Modal open={open} onClose={closeForm} title="新增幹部職位">
        <form onSubmit={createOfficer} className="space-y-4">
          <Field label="使用者" htmlFor="officer-user" required>
            <AdminUserPicker
              key={pickerResetKey}
              id="officer-user"
              disabled={busy}
              onChange={(user) =>
                setValues((current) => ({
                  ...current,
                  user_id: user?.id ?? "",
                }))
              }
            />
          </Field>
          <Field label="學年度" htmlFor="officer-year" required>
            <Select
              id="officer-year" required
              className="w-full"
              value={values.academic_year_id}
              disabled={busy}
              onChange={(event) => setValues((current) => ({ ...current, academic_year_id: event.target.value }))}
            >
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="職位" htmlFor="officer-title" required>
            <Input
              id="officer-title"
              className="w-full"
              required
              value={values.title}
              disabled={busy}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>
          <FormFeedback error={error} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={closeForm}>
              取消
            </Button>
            <Button type="submit" isLoading={busy} disabled={!values.user_id}>
              {busy ? "新增中…" : "新增"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
