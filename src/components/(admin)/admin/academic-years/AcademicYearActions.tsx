"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { AcademicYear } from "@/types/database";

type Workflow = "current" | "delete";

export function AcademicYearActions({ year }: { year?: AcademicYear }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [values, setValues] = useState({ year: year?.year ?? "", start_date: year?.start_date.slice(0, 10) ?? "", end_date: year?.end_date.slice(0, 10) ?? "" });

  function openForm() { setFormError(null); setFormOpen(true); }
  function closeForm() { if (!formBusy) { setFormError(null); setFormOpen(false); } }
  function openWorkflow(next: Workflow) { setWorkflowError(null); setWorkflow(next); }
  function closeWorkflow() { if (!workflowBusy) { setWorkflowError(null); setWorkflow(null); } }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setFormBusy(true); setFormError(null);
    try { await apiClient(year ? `/api/admin/academic-years/${year.id}` : "/api/admin/academic-years", { method: year ? "PATCH" : "POST", body: values }); setFormOpen(false); router.refresh(); }
    catch (error) { setFormError(error instanceof Error ? error.message : "儲存學年度失敗。 "); }
    finally { setFormBusy(false); }
  }

  async function runWorkflow() {
    if (!year || !workflow) return;
    const action = workflow; setWorkflowBusy(true); setWorkflowError(null);
    try { await apiClient(`/api/admin/academic-years/${year.id}`, { method: action === "delete" ? "DELETE" : "PATCH", ...(action === "current" ? { body: { action: "set-current" } } : {}) }); setWorkflow(null); router.refresh(); }
    catch (error) { setWorkflowError(action === "delete" && error instanceof ApiError && error.status === 409 ? "此學年度已有社員資格或幹部職位資料，無法刪除" : error instanceof Error ? error.message : "更新學年度失敗。 "); }
    finally { setWorkflowBusy(false); }
  }

  const workflowDescription = workflowError ?? (year ? `${year.year} 學年度將被更新。` : "");
  return <>
    <Button type="button" size="sm" variant={year ? "outline" : "primary"} onClick={openForm}>{year ? "編輯" : "新增學年度"}</Button>
    {year && !year.is_current && <Button type="button" size="sm" onClick={() => openWorkflow("current")}>設為目前</Button>}
    {year && !year.is_current && <Button type="button" size="sm" variant="danger" onClick={() => openWorkflow("delete")}>刪除</Button>}
    <Modal open={formOpen} onClose={closeForm} title={year ? "編輯學年度" : "新增學年度"}>
      <form onSubmit={save} className="space-y-4">
        <Field label="學年度" htmlFor="academic-year" hint="例如：115"><Input id="academic-year" autoFocus required pattern="\d{3}" className="w-full" value={values.year} onChange={event => setValues({ ...values, year: event.target.value })} /></Field>
        <Field label="開始日期" htmlFor="academic-year-start"><Input id="academic-year-start" required type="date" className="w-full" value={values.start_date} onChange={event => setValues({ ...values, start_date: event.target.value })} /></Field>
        <Field label="結束日期" htmlFor="academic-year-end"><Input id="academic-year-end" required type="date" className="w-full" value={values.end_date} onChange={event => setValues({ ...values, end_date: event.target.value })} /></Field>
        <FormFeedback error={formError} />
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closeForm} disabled={formBusy}>取消</Button><Button type="submit" isLoading={formBusy}>{year ? (formBusy ? "儲存中…" : "儲存") : (formBusy ? "新增中…" : "新增")}</Button></div>
      </form>
    </Modal>
    <ConfirmDialog open={workflow !== null} onClose={closeWorkflow} onConfirm={runWorkflow} isSubmitting={workflowBusy} title={workflow === "current" ? "設為目前學年度？" : "刪除學年度？"} description={workflowDescription} confirmLabel={workflow === "delete" ? "確認刪除" : "確認設定"} />
  </>;
}
