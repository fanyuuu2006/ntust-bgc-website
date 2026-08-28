"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/libs/api/client";
import type { AcademicYear } from "@/types/database";

const emptyValues = { year: "", start_date: "", end_date: "" };

type AcademicYearValues = typeof emptyValues;

export function AcademicYearManager({ years }: { years: AcademicYear[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AcademicYear | "new" | null>(null);
  const [confirmingCurrent, setConfirmingCurrent] =
    useState<AcademicYear | null>(null);
  const [deleting, setDeleting] = useState<AcademicYear | null>(null);
  const [values, setValues] = useState<AcademicYearValues>(emptyValues);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setValues(emptyValues);
    setError(null);
    setEditing("new");
  }

  function openEdit(year: AcademicYear) {
    setValues({
      year: year.year,
      start_date: year.start_date.slice(0, 10),
      end_date: year.end_date.slice(0, 10),
    });
    setError(null);
    setEditing(year);
  }

  function setValue(key: keyof AcademicYearValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient(
        editing === "new"
          ? "/api/admin/academic-years"
          : `/api/admin/academic-years/${editing.id}`,
        {
          method: editing === "new" ? "POST" : "PATCH",
          body: values,
        },
      );
      setSuccess(`學年度已${editing === "new" ? "新增" : "更新"}。`);
      setEditing(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function setCurrent() {
    if (!confirmingCurrent) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/admin/academic-years/${confirmingCurrent.id}`, {
        method: "PATCH",
        body: { action: "set-current" },
      });
      setSuccess("目前學年度已更新。");
      setConfirmingCurrent(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新失敗。");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient(`/api/admin/academic-years/${deleting.id}`, {
        method: "DELETE",
      });
      setSuccess("學年度已刪除。");
      setDeleting(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "刪除失敗。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          + 新增學年度
        </Button>
      </div>

      <FormFeedback error={error} success={success} />

      <div className="grid gap-3">
        {years.map((year) => (
          <article
            key={year.id}
            className="card flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-(--text-primary)">
                  {year.year} 學年度
                </h2>
                {year.is_current ? <Badge tone="info">目前學年度</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-(--text-muted)">
                {year.start_date.slice(0, 10)} 至 {year.end_date.slice(0, 10)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy || year.is_current}
                onClick={() => setConfirmingCurrent(year)}
              >
                設為目前
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => openEdit(year)}
              >
                編輯
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busy || year.is_current}
                onClick={() => setDeleting(year)}
              >
                刪除
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
        title={editing === "new" ? "新增學年度" : "編輯學年度"}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="學年度" htmlFor="academic-year" hint="例如：115">
            <Input
              id="academic-year"
              autoFocus
              required
              pattern="\d{3}"
              value={values.year}
              onChange={(event) => setValue("year", event.target.value)}
              disabled={busy}
            />
          </Field>
          <Field label="開始日期" htmlFor="academic-year-start">
            <Input
              id="academic-year-start"
              required
              type="date"
              value={values.start_date}
              onChange={(event) => setValue("start_date", event.target.value)}
              disabled={busy}
            />
          </Field>
          <Field label="結束日期" htmlFor="academic-year-end">
            <Input
              id="academic-year-end"
              required
              type="date"
              value={values.end_date}
              onChange={(event) => setValue("end_date", event.target.value)}
              disabled={busy}
            />
          </Field>
          <FormFeedback error={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button isLoading={busy}>{busy ? "儲存中…" : "儲存"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmingCurrent !== null}
        onClose={() => {
          if (!busy) setConfirmingCurrent(null);
        }}
        onConfirm={setCurrent}
        isSubmitting={busy}
        title="設定目前學年度？"
        description={
          confirmingCurrent
            ? `確定將 ${confirmingCurrent.year} 設為目前學年度嗎？這會影響使用目前學年度的功能與資料。`
            : ""
        }
        confirmLabel="設為目前"
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        onConfirm={remove}
        isSubmitting={busy}
        title="刪除學年度？"
        description={
          deleting
            ? `確定刪除 ${deleting.year} 學年度嗎？若已有社員資格或幹部職位資料，系統會拒絕刪除。`
            : ""
        }
      />
    </div>
  );
}
