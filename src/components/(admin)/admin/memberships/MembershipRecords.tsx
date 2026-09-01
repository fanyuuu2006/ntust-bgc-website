"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
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
import type { AdminMembership } from "@/services/memberships/memberships.types";
import type { AcademicYear, MembershipStatus } from "@/types/database";
import { formatAdminDateTime } from "@/utils/date";
import { MemberStatusBadge, MEMBERSHIP_STATUS_LABEL, MembershipTypeLabel } from "./MemberStatusBadge";

type Query = {
  orderBy?: "joined_at" | "created_at" | "status";
  orderDirection?: "asc" | "desc";
  search?: string;
  academic_year_id?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

type MembershipFormValues = {
  academic_year_id: string;
  status: MembershipStatus;
  joined_at: string;
};

export function MembershipRecords({
  memberships,
  years,
  query,
}: {
  memberships: AdminMembership[];
  years: AcademicYear[];
  query: Query;
}) {
  const router = useRouter();
  const [selectedMembership, setSelectedMembership] = useState<
    { membership: AdminMembership; action: "edit" | "delete" } | null
  >(null);
  const [values, setValues] = useState<MembershipFormValues>({
    academic_year_id: "",
    status: "active",
    joined_at: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editingMembership = selectedMembership?.action === "edit" ? selectedMembership.membership : null;
  const deletingMembership = selectedMembership?.action === "delete" ? selectedMembership.membership : null;
  const headerQuery = Object.fromEntries(
    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );

  const openEditDialog = (membership: AdminMembership) => {
    setSelectedMembership({ membership, action: "edit" });
    setValues({
      academic_year_id: membership.academic_year_id,
      status: membership.status,
      joined_at: membership.joined_at?.slice(0, 16) ?? "",
    });
    setEditError(null);
  };

  const closeEditDialog = () => {
    if (isSaving) return;

    setSelectedMembership(null);
    setEditError(null);
  };

  const openDeleteDialog = (membership: AdminMembership) => {
    setSelectedMembership({ membership, action: "delete" });
    setDeleteError(null);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;

    setSelectedMembership(null);
    setDeleteError(null);
  };

  const saveMembership = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMembership) return;

    setIsSaving(true);
    setEditError(null);

    try {
      await apiClient(`/api/admin/memberships/${editingMembership.id}`, {
        method: "PATCH",
        body: {
          ...values,
          joined_at: values.joined_at ? new Date(values.joined_at).toISOString() : null,
        },
      });
      setSelectedMembership(null);
      router.refresh();
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "更新社員資格失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  const removeMembership = async () => {
    if (!deletingMembership) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient(`/api/admin/memberships/${deletingMembership.id}`, { method: "DELETE" });
      setSelectedMembership(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "刪除社員資格失敗，請稍後再試。");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!memberships.length) {
    return <EmptyState title="找不到符合條件的社員資格" description="請調整搜尋或篩選條件後再試。" />;
  }

  return (
    <>
      <Card className="hidden overflow-x-auto p-0 lg:block">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow>
              <TableHead>使用者</TableHead>
              <TableHead>類型</TableHead>
              <TableHead>學年度</TableHead>
              <SortableTableHeader label="狀態" column="status" basePath="/admin/memberships" query={headerQuery} />
              <SortableTableHeader label="加入時間" column="joined_at" basePath="/admin/memberships" query={headerQuery} />
              <SortableTableHeader label="建立時間" column="created_at" basePath="/admin/memberships" query={headerQuery} />
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((membership) => (
              <TableRow key={membership.id}>
                <TableCell>
                  <p className="font-medium">{membership.user_profile?.real_name || membership.user.name}</p>
                  <p className="text-xs text-(--muted)">{membership.user_profile?.student_id ?? membership.user.email}</p>
                </TableCell>
                <TableCell>
                  <MembershipTypeLabel type={membership.type} />
                </TableCell>
                <TableCell>{membership.academic_year?.year ?? "—"}</TableCell>
                <TableCell>
                  <MemberStatusBadge status={membership.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(membership.joined_at)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(membership.created_at)}</TableCell>
                <TableCell className="text-right">
                  <MembershipRowActions
                    membership={membership}
                    onEdit={openEditDialog}
                    onDelete={openDeleteDialog}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-3 lg:hidden">
        {memberships.map((membership) => (
          <Card key={membership.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{membership.user_profile?.real_name || membership.user.name}</p>
                <p className="text-xs text-(--muted)">{membership.user_profile?.student_id ?? membership.user.email}</p>
              </div>
              <span className="shrink-0">
                <MemberStatusBadge status={membership.status} />
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt>類型</dt>
                <dd>
                  <MembershipTypeLabel type={membership.type} />
                </dd>
              </div>
              <div>
                <dt>學年度</dt>
                <dd>{membership.academic_year?.year ?? "—"}</dd>
              </div>
              <div>
                <dt>加入時間</dt>
                <dd>{formatAdminDateTime(membership.joined_at)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <MembershipRowActions
                membership={membership}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            </div>
          </Card>
        ))}
      </div>

      <Modal open={editingMembership !== null} onClose={closeEditDialog} title="編輯社員資格">
        <form onSubmit={saveMembership} className="space-y-4">
          <Field label="學年度" htmlFor="membership-year">
            <Select
              id="membership-year"
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
          <p className="text-sm text-(--muted)">社員類型會依幹部職位紀錄自動重新判定。</p>
          <Field label="狀態" htmlFor="membership-status">
            <Select
              id="membership-status"
              className="w-full"
              value={values.status}
              disabled={isSaving}
              onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as MembershipStatus }))}
            >
              {Object.entries(MEMBERSHIP_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="加入時間" htmlFor="membership-joined-at">
            <Input
              id="membership-joined-at"
              className="w-full"
              type="datetime-local"
              value={values.joined_at}
              disabled={isSaving}
              onChange={(event) => setValues((current) => ({ ...current, joined_at: event.target.value }))}
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
        open={deletingMembership !== null}
        onClose={closeDeleteDialog}
        onConfirm={removeMembership}
        isSubmitting={isDeleting}
        title="刪除社員資格"
        description={
          deletingMembership
            ? `確定要刪除這筆社員資格嗎？${deleteError ? ` ${deleteError}` : ""}`
            : ""
        }
        confirmLabel="確認刪除"
      />
    </>
  );
}

function MembershipRowActions({
  membership,
  onEdit,
  onDelete,
}: {
  membership: AdminMembership;
  onEdit: (membership: AdminMembership) => void;
  onDelete: (membership: AdminMembership) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(membership)}>
        編輯
      </Button>
      <Button type="button" size="sm" variant="danger" onClick={() => onDelete(membership)}>
        刪除
      </Button>
    </div>
  );
}
