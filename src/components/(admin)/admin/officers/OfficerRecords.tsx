"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import type { AcademicYear, User } from "@/types/database";

type Officer = {
  id: string;
  title: string;
  user: User;
  academic_year: AcademicYear | null;
};

type OfficerFormValues = {
  academic_year_id: string;
  title: string;
};

export function OfficerRecords({
  officers,
  years,
}: {
  officers: Officer[];
  years: AcademicYear[];
}) {
  const router = useRouter();
  const [selectedOfficer, setSelectedOfficer] = useState<
    { officer: Officer; action: "edit" | "delete" } | null
  >(null);
  const [values, setValues] = useState<OfficerFormValues>({ academic_year_id: "", title: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editingOfficer = selectedOfficer?.action === "edit" ? selectedOfficer.officer : null;
  const deletingOfficer = selectedOfficer?.action === "delete" ? selectedOfficer.officer : null;

  const openEditDialog = (officer: Officer) => {
    setSelectedOfficer({ officer, action: "edit" });
    setValues({
      academic_year_id: officer.academic_year?.id ?? "",
      title: officer.title,
    });
    setEditError(null);
  };

  const closeEditDialog = () => {
    if (isSaving) return;

    setSelectedOfficer(null);
    setEditError(null);
  };

  const openDeleteDialog = (officer: Officer) => {
    setSelectedOfficer({ officer, action: "delete" });
    setDeleteError(null);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;

    setSelectedOfficer(null);
    setDeleteError(null);
  };

  const saveOfficer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingOfficer) return;

    setIsSaving(true);
    setEditError(null);

    try {
      await apiClient(`/api/admin/officers/${editingOfficer.id}`, {
        method: "PATCH",
        body: values,
      });
      setSelectedOfficer(null);
      router.refresh();
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "更新幹部職位失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  const removeOfficer = async () => {
    if (!deletingOfficer) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient(`/api/admin/officers/${deletingOfficer.id}`, { method: "DELETE" });
      setSelectedOfficer(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "刪除幹部職位失敗，請稍後再試。");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!officers.length) {
    return <EmptyState title="沒有符合條件的幹部職位" description="調整搜尋條件或新增幹部職位。" />;
  }

  return (
    <>
      <Card className="hidden overflow-x-auto p-0 lg:block">
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead>使用者</TableHead>
              <TableHead>職位</TableHead>
              <TableHead>學年度</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {officers.map((officer) => (
              <TableRow key={officer.id}>
                <TableCell className="min-w-52">
                  <p className="truncate">{officer.user.name}</p>
                  <p className="truncate text-xs text-(--muted)">{officer.user.email}</p>
                </TableCell>
                <TableCell className="min-w-32">{officer.title}</TableCell>
                <TableCell className="whitespace-nowrap">{officer.academic_year?.year ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <OfficerRowActions officer={officer} onEdit={openEditDialog} onDelete={openDeleteDialog} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 lg:hidden">
        {officers.map((officer) => (
          <Card key={officer.id} className="w-full min-w-0 max-w-full p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{officer.user.name}</p>
              <p className="truncate text-sm text-(--muted)">{officer.user.email}</p>
              <p>{officer.title} · {officer.academic_year?.year ?? "—"}</p>
            </div>
            <div className="mt-3 flex min-w-0 max-w-full flex-wrap gap-2">
              <OfficerRowActions officer={officer} onEdit={openEditDialog} onDelete={openDeleteDialog} />
            </div>
          </Card>
        ))}
      </div>

      <Modal open={editingOfficer !== null} onClose={closeEditDialog} title="編輯幹部職位">
        <form onSubmit={saveOfficer} className="space-y-4">
          <Field label="學年度" htmlFor="officer-year">
            <Select
              id="officer-year"
              className="w-full"
              value={values.academic_year_id}
              disabled={isSaving}
              onChange={(event) => setValues((current) => ({ ...current, academic_year_id: event.target.value }))}
            >
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="職位" htmlFor="officer-title">
            <Input
              id="officer-title"
              className="w-full"
              required
              value={values.title}
              disabled={isSaving}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>
          <FormFeedback error={editError} />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={isSaving} onClick={closeEditDialog}>
              取消
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isSaving ? "儲存中…" : "儲存"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletingOfficer !== null}
        onClose={closeDeleteDialog}
        onConfirm={removeOfficer}
        isSubmitting={isDeleting}
        title="刪除幹部職位"
        description={
          deletingOfficer
            ? `確定要刪除「${deletingOfficer.title}」嗎？${deleteError ? ` ${deleteError}` : ""}`
            : ""
        }
      />
    </>
  );
}

function OfficerRowActions({
  officer,
  onEdit,
  onDelete,
}: {
  officer: Officer;
  onEdit: (officer: Officer) => void;
  onDelete: (officer: Officer) => void;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => onEdit(officer)}>
        編輯
      </Button>
      <Button type="button" size="sm" variant="danger" onClick={() => onDelete(officer)}>
        刪除
      </Button>
    </div>
  );
}
