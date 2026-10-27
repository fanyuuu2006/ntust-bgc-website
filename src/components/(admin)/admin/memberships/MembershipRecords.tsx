"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminBulkActionBar } from "@/components/(admin)/admin/AdminBulkActionBar";
import { AdminMobileBulkModeButton } from "@/components/(admin)/admin/AdminMobileBulkModeButton";
import { AdminSelectionCheckbox } from "@/components/(admin)/admin/AdminSelectionCheckbox";
import { AdminUserLink } from "@/components/(admin)/admin/users/AdminUserLink";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import { useToast } from "@/contexts/ToastContext";
import type { AdminMembership } from "@/services/memberships/memberships.types";
import type { AcademicYear, MembershipStatus } from "@/types/database";
import { canTransitionMembershipStatus } from "@/utils/membership-status";
import { useCurrentPageSelection } from "@/hooks/useCurrentPageSelection";
import {
  formatAdminDateTime,
  formatTaipeiDateTimeLocal,
  parseTaipeiDateTimeLocal,
} from "@/utils/date";
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
  const { showToast } = useToast();
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
  const [mobileBulkMode, setMobileBulkMode] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<MembershipStatus>("active");
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const editingMembership = selectedMembership?.action === "edit" ? selectedMembership.membership : null;
  const deletingMembership = selectedMembership?.action === "delete" ? selectedMembership.membership : null;
  const {
    selectedIds,
    selectedCount,
    allSelected,
    partiallySelected,
    setItemSelected: setMembershipSelected,
    setCurrentPageSelected,
    clearSelection,
  } = useCurrentPageSelection(memberships.map((membership) => membership.id));
  const selectedMemberships = memberships.filter((membership) =>
    selectedIds.has(membership.id),
  );
  const selectedAcademicYearCount = new Set(
    selectedMemberships.map((membership) => membership.academic_year_id),
  ).size;
  const availableBulkStatuses = (
    Object.keys(MEMBERSHIP_STATUS_LABEL) as MembershipStatus[]
  ).filter(
    (status) =>
      selectedMemberships.length > 0 &&
      selectedMemberships.every((membership) =>
        canTransitionMembershipStatus(membership.status, status),
      ) &&
      selectedMemberships.some((membership) => membership.status !== status),
  );
  const canBulkUpdate =
    selectedCount > 0 &&
    selectedAcademicYearCount === 1 &&
    availableBulkStatuses.length > 0;
  const effectiveBulkStatus = availableBulkStatuses.includes(bulkStatus)
    ? bulkStatus
    : (availableBulkStatuses[0] ?? "active");
  const isMutating = isSaving || isDeleting || isBulkUpdating;
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
      joined_at: membership.joined_at
        ? formatTaipeiDateTimeLocal(new Date(membership.joined_at))
        : "",
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
          joined_at: values.joined_at
            ? editingMembership.joined_at &&
              values.joined_at ===
                formatTaipeiDateTimeLocal(new Date(editingMembership.joined_at))
              ? editingMembership.joined_at
              : parseTaipeiDateTimeLocal(values.joined_at)
            : null,
        },
      });
      setSelectedMembership(null);
      showToast("success", "社員資格已更新");
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
      showToast("success", "社員資格已刪除");
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "刪除社員資格失敗，請稍後再試。");
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkUpdateMemberships = async () => {
    if (!canBulkUpdate) return;

    setIsBulkUpdating(true);
    setBulkFeedback(null);
    try {
      const response = await apiClient<{ data: { updatedCount: number } }>(
        "/api/admin/memberships/batch",
        {
          method: "PATCH",
          body: {
            action: "set-status",
            status: effectiveBulkStatus,
            records: selectedMemberships.map((membership) => ({
              id: membership.id,
              expected_status: membership.status,
              expected_academic_year_id: membership.academic_year_id,
              expected_updated_at: membership.updated_at,
            })),
          },
        },
      );
      clearSelection();
      setIsBulkDialogOpen(false);
      setBulkFeedback({
        tone: "success",
        message: `已更新 ${response.data.updatedCount} 筆社員資格`,
      });
      showToast("success", `已更新 \${response.data.updatedCount} 筆社員資格`);
      router.refresh();
    } catch (caught) {
      setIsBulkDialogOpen(false);
      setBulkFeedback({
        tone: "error",
        message:
          caught instanceof Error
            ? caught.message
            : "批次更新社員資格失敗，請稍後再試",
      });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  if (!memberships.length) {
    const hasQuery = Boolean(query.search || query.academic_year_id || query.status || query.page && query.page > 1);
    return hasQuery ? (
      <QueryEmptyState
        title="找不到符合條件的社員資格"
        description="請調整搜尋或篩選條件後再試。"
        clearHref="/admin/memberships"
      />
    ) : (
      <EmptyState title="目前沒有社員資格紀錄" />
    );
  }

  return (
    <>
      {bulkFeedback ? (
        <FormFeedback
          error={bulkFeedback.tone === "error" ? bulkFeedback.message : null}
          success={bulkFeedback.tone === "success" ? bulkFeedback.message : null}
        />
      ) : null}

      <AdminMobileBulkModeButton active={mobileBulkMode} disabled={isMutating} selectedCount={selectedCount} selectionControl={<div className="flex items-center gap-1 text-sm"><AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isMutating} onCheckedChange={(checked) => { setCurrentPageSelected(checked); setBulkFeedback(null); }} label="選取本頁全部社員資格" />全選本頁</div>} onChange={(active) => { setMobileBulkMode(active); if (!active) clearSelection(); }} />

      {selectedCount > 0 ? (
        <AdminBulkActionBar
          selectedCount={selectedCount}
          disabled={isMutating}
          mobilePresentation="panel"
          onClear={() => { clearSelection(); setMobileBulkMode(false); }}
          notice={selectedAcademicYearCount > 1 ? "需先將清單篩選為單一學年度，再重新選取要更新的紀錄。" : undefined}
        >
          {canBulkUpdate ? (
            <>
              <label className="grid min-w-0 gap-1.5 text-sm font-medium text-(--text-primary) lg:flex lg:items-center lg:gap-2 lg:text-(--text-secondary)">
                <span>批次狀態</span>
                <Select
                  aria-label="批次更新社員資格狀態"
                  value={effectiveBulkStatus}
                  disabled={isMutating}
                  onChange={(event) =>
                    setBulkStatus(event.target.value as MembershipStatus)
                  }
                  className="w-full lg:w-auto"
                >
                  {availableBulkStatuses.map((status) => (
                    <option key={status} value={status}>
                      {MEMBERSHIP_STATUS_LABEL[status]}
                    </option>
                  ))}
                </Select>
              </label>
              <Button type="button" size="sm" className="w-full lg:w-auto" disabled={isMutating} onClick={() => setIsBulkDialogOpen(true)}>
                批次更新
              </Button>
            </>
          ) : null}
          {selectedAcademicYearCount > 1 ? (
            <Button type="button" size="sm" className="w-full lg:w-auto" variant="outline" disabled={isMutating} onClick={() => {
              const firstYear = selectedMemberships[0]?.academic_year_id;
              if (!firstYear) return;
              const params = new URLSearchParams();
              Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && key !== "page" && key !== "academic_year_id") params.set(key, String(value));
              });
              params.set("academic_year_id", firstYear);
              router.push(`/admin/memberships?${params.toString()}`);
            }}>
              依第一筆學年度篩選
            </Button>
          ) : null}
        </AdminBulkActionBar>
      ) : null}

      <AdminListSection className="hidden lg:block">
        <Table className="min-w-[1168px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <AdminSelectionCheckbox
                  checked={allSelected}
                  indeterminate={partiallySelected}
                  disabled={isMutating}
                  onCheckedChange={(checked) => { setCurrentPageSelected(checked); setBulkFeedback(null); }}
                  label="選取本頁全部社員資格"
                />
              </TableHead>
              <TableHead className="w-64">使用者</TableHead>
              <TableHead className="w-24 whitespace-nowrap">類型</TableHead>
              <TableHead className="w-28 whitespace-nowrap">學年度</TableHead>
              <SortableTableHeader
                label="狀態"
                column="status"
                basePath="/admin/memberships"
                query={headerQuery}
                className="w-28 whitespace-nowrap"
              />
              <SortableTableHeader
                label="加入時間"
                column="joined_at"
                basePath="/admin/memberships"
                query={headerQuery}
                className="w-44 whitespace-nowrap"
              />
              <SortableTableHeader
                label="建立時間"
                column="created_at"
                basePath="/admin/memberships"
                query={headerQuery}
                className="w-44 whitespace-nowrap"
              />
              <TableHead className="w-36 whitespace-nowrap text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((membership) => (
              <TableRow key={membership.id}>
                <TableCell className="w-12">
                  <AdminSelectionCheckbox
                    checked={selectedIds.has(membership.id)}
                    disabled={isMutating}
                    onCheckedChange={(checked) => { setMembershipSelected(membership.id, checked); setBulkFeedback(null); }}
                    label={`選取 ${membership.user.name} 的社員資格`}
                  />
                </TableCell>
                <TableCell className="w-64 max-w-64 min-w-0">
                  <AdminUserLink
                    userId={membership.user.id}
                    identity={{
                      ...membership.user,
                      real_name: membership.user_profile?.real_name ?? null,
                      student_id: membership.user_profile?.student_id ?? null,
                    }}
                    disambiguation={membership.user_profile?.student_id ? "studentId" : "email"}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <MembershipTypeLabel type={membership.type} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{membership.academic_year?.year ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <MemberStatusBadge status={membership.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(membership.joined_at)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatAdminDateTime(membership.created_at)}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <MembershipRowActions
                    membership={membership}
                    disabled={isMutating}
                    onEdit={openEditDialog}
                    onDelete={openDeleteDialog}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminListSection>

      <div className="grid gap-2.5 lg:hidden">
        {memberships.map((membership) => (
          <Card key={membership.id} className="space-y-2.5 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {mobileBulkMode ? <AdminSelectionCheckbox
                  checked={selectedIds.has(membership.id)}
                  disabled={isMutating}
                  onCheckedChange={(checked) => { setMembershipSelected(membership.id, checked); setBulkFeedback(null); }}
                  label={`選取 ${membership.user.name} 的社員資格`}
                  containerClassName="-mt-1 -ml-1"
                /> : null}
                <AdminUserLink
                  userId={membership.user.id}
                  identity={{
                    ...membership.user,
                    real_name: membership.user_profile?.real_name ?? null,
                    student_id: membership.user_profile?.student_id ?? null,
                  }}
                  disambiguation={membership.user_profile?.student_id ? "studentId" : "email"}
                  variant="mobile"
                  className="min-w-0 flex-1"
                />
              </div>
              <span className="shrink-0">
                <MemberStatusBadge status={membership.status} />
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
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
            {!mobileBulkMode ? <div className="flex flex-wrap gap-2 border-t border-(--border-muted) pt-3">
              <MembershipRowActions
                membership={membership}
                disabled={isMutating}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            </div> : null}
          </Card>
        ))}
      </div>

      <Modal open={editingMembership !== null} onClose={closeEditDialog} title="編輯社員資格">
        <form onSubmit={saveMembership} className="space-y-4">
          <Field label="學年度" htmlFor="membership-year" required>
            <Select
              id="membership-year" required
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
          <Field label="狀態" htmlFor="membership-status" required>
            <Select
              id="membership-status" required
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
      <ConfirmDialog
        open={isBulkDialogOpen}
        onClose={() => !isBulkUpdating && setIsBulkDialogOpen(false)}
        onConfirm={bulkUpdateMemberships}
        isSubmitting={isBulkUpdating}
        title="批次更新社員資格狀態"
        description={`確定要將已選取的 ${selectedCount} 筆社員資格更新為「${MEMBERSHIP_STATUS_LABEL[effectiveBulkStatus]}」嗎？這可能立即影響借用與活動簽到資格。`}
        confirmLabel="確認批次更新"
      />
    </>
  );
}
function MembershipRowActions({
  membership,
  disabled,
  onEdit,
  onDelete,
}: {
  membership: AdminMembership;
  disabled: boolean;
  onEdit: (membership: AdminMembership) => void;
  onDelete: (membership: AdminMembership) => void;
}) {
  return (
    <div className="flex flex-nowrap justify-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onEdit(membership)}>
        編輯
      </Button>
      <Button type="button" size="sm" variant="danger" disabled={disabled} onClick={() => onDelete(membership)}>
        刪除
      </Button>
    </div>
  );
}
