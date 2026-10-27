"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AdminBulkActionBar } from "@/components/(admin)/admin/AdminBulkActionBar";
import { AdminMobileBulkModeButton } from "@/components/(admin)/admin/AdminMobileBulkModeButton";
import { AdminSelectionCheckbox } from "@/components/(admin)/admin/AdminSelectionCheckbox";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import type { MembershipRegisterKeyWithAcademicYear } from "@/services/memberships/memberships.types";
import { formatAdminDateTime } from "@/utils/date";
import { useCurrentPageSelection } from "@/hooks/useCurrentPageSelection";
import { RegisterKeyStatusBadge } from "./RegisterKeyStatusBadge";
import { useToast } from "@/contexts/ToastContext";

type RegisterKeyTableProps = {
  registerKeys: MembershipRegisterKeyWithAcademicYear[];
  hasFilters?: boolean;
};

export function RegisterKeyTable({
  registerKeys,
  hasFilters = false,
}: RegisterKeyTableProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingRevocation, setPendingRevocation] =
    useState<MembershipRegisterKeyWithAcademicYear | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isBulkRevokeDialogOpen, setIsBulkRevokeDialogOpen] = useState(false);
  const [mobileBulkMode, setMobileBulkMode] = useState(false);
  const {
    selectedIds,
    selectedCount,
    allSelected,
    partiallySelected,
    setItemSelected: setRegisterKeySelected,
    setCurrentPageSelected,
    clearSelection,
  } = useCurrentPageSelection(registerKeys.map((registerKey) => registerKey.id));
  const selectedRegisterKeys = registerKeys.filter((registerKey) =>
    selectedIds.has(registerKey.id),
  );
  const selectedAvailableCount = selectedRegisterKeys.filter(
    (registerKey) => registerKey.status === "available",
  ).length;
  const canBulkRevoke =
    selectedCount > 0 && selectedAvailableCount === selectedCount;

  async function copySelectedRegisterKeys() {
    const seen = new Set<string>();
    const values = registerKeys
      .filter((registerKey) => selectedIds.has(registerKey.id))
      .map((registerKey) => registerKey.register_key)
      .filter((registerKey) => {
        if (seen.has(registerKey)) return false;
        seen.add(registerKey);
        return true;
      });

    if (!values.length) return;

    try {
      await navigator.clipboard.writeText(values.join("\n"));
      showToast("success", `已複製 ${values.length} 組社員註冊序號`);
    } catch {
      setFeedback("無法複製已選取的社員註冊序號，請稍後再試。");
    }
  }

  async function copyRegisterKey(registerKey: string) {
    try {
      await navigator.clipboard.writeText(registerKey);
      showToast("success", "已複製社員註冊序號");
    } catch {
      setFeedback("無法複製社員註冊序號，請手動複製。");
    }
  }

  async function revokeRegisterKey() {
    if (!pendingRevocation) return;

    setIsRevoking(true);
    setFeedback(null);

    try {
      const response = await fetch(
        `/api/admin/members/register-keys/${pendingRevocation.id}`,
        { method: "PATCH" },
      );
      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(body.message ?? "撤銷社員註冊序號失敗，請稍後再試。");
      }

      showToast("success", "社員註冊序號已撤銷");
      setRegisterKeySelected(pendingRevocation.id, false);
      setPendingRevocation(null);
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "撤銷社員註冊序號失敗，請稍後再試。",
      );
    } finally {
      setIsRevoking(false);
    }
  }

  async function bulkRevokeRegisterKeys() {
    if (!canBulkRevoke) return;

    setIsRevoking(true);
    setFeedback(null);

    try {
      const response = await apiClient<{ data: { revokedCount: number } }>(
        "/api/admin/members/register-keys/batch",
        {
          method: "PATCH",
          body: {
            action: "revoke",
            ids: selectedRegisterKeys.map(({ id }) => id),
          },
        },
      );
      clearSelection();
      setIsBulkRevokeDialogOpen(false);
      showToast("success", `已撤銷 ${response.data.revokedCount} 組社員註冊序號`);
      router.refresh();
    } catch (error) {
      setIsBulkRevokeDialogOpen(false);
      setFeedback(
        error instanceof Error
          ? error.message
          : "批次撤銷社員註冊序號失敗，請稍後再試。",
      );
    } finally {
      setIsRevoking(false);
    }
  }

  if (!registerKeys.length) {
    if (hasFilters) {
      return (
        <QueryEmptyState
          title="沒有符合條件的社員註冊序號"
          clearHref="/admin/memberships/register-keys"
        />
      );
    }

    return (
      <EmptyState
        title="目前沒有社員註冊序號"
      />
    );
  }

  return (
    <div className="space-y-3">
      {feedback ? (
        <p
          role="status"
          className="rounded-lg border border-(--border) bg-(--surface-subtle) px-3 py-2 text-sm text-(--text-primary)"
        >
          {feedback}
        </p>
      ) : null}

      <AdminMobileBulkModeButton active={mobileBulkMode} disabled={isRevoking} selectedCount={selectedCount} selectionControl={<div className="flex items-center gap-1 text-sm"><AdminSelectionCheckbox checked={allSelected} indeterminate={partiallySelected} disabled={isRevoking} onCheckedChange={setCurrentPageSelected} label="選取目前頁面的所有社員註冊序號" />全選本頁</div>} onChange={(active) => { setMobileBulkMode(active); if (!active) clearSelection(); }} />

      {selectedCount > 0 ? (
        <AdminBulkActionBar
          selectedCount={selectedCount}
          disabled={isRevoking}
          mobilePresentation="inline"
          onClear={() => { clearSelection(); setMobileBulkMode(false); }}
          notice={selectedCount > selectedAvailableCount ? `已選取 ${selectedCount} 筆，其中 ${selectedAvailableCount} 筆可撤銷；請取消不可撤銷的項目後再試。` : undefined}
        >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-fit flex-1 lg:flex-none"
          disabled={isRevoking}
          onClick={copySelectedRegisterKeys}
        >
          複製已選序號
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="min-w-fit flex-1 lg:flex-none"
          disabled={!canBulkRevoke || isRevoking}
          onClick={() => setIsBulkRevokeDialogOpen(true)}
        >
          批次撤銷
        </Button>
        </AdminBulkActionBar>
      ) : null}

      <div className="grid gap-2.5 lg:hidden">
        {registerKeys.map((registerKey) => (
          <Card key={registerKey.id} className="min-w-0 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {mobileBulkMode ? <AdminSelectionCheckbox
                  checked={selectedIds.has(registerKey.id)}
                  disabled={isRevoking}
                  onCheckedChange={(checked) => setRegisterKeySelected(registerKey.id, checked)}
                  label={`選取社員註冊序號 ${registerKey.register_key}`}
                  containerClassName="-mt-1 -ml-1"
                /> : null}
                <span className="min-w-0">
                <p className="break-all font-mono text-xs text-(--text-primary)">
                  {registerKey.register_key}
                </p>
                <p className="mt-1 text-xs text-(--text-muted)">
                  {registerKey.academic_year?.year ?? "未知"} 學年度 · 序號 #
                  {registerKey.sequence_number}
                </p>
                </span>
              </div>
              <RegisterKeyStatusBadge status={registerKey.status} />
            </div>
            <p className="mt-3 text-xs text-(--text-muted)">
              建立於 {formatAdminDateTime(registerKey.created_at)}
            </p>
            {!mobileBulkMode ? (
              <RegisterKeyActions
                registerKey={registerKey}
                isRevoking={isRevoking}
                onCopy={copyRegisterKey}
                onRevoke={setPendingRevocation}
                className="mt-3 border-t border-(--border-muted) pt-3"
              />
            ) : null}
          </Card>
        ))}
      </div>

      <AdminListSection className="hidden lg:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <AdminSelectionCheckbox
                  checked={allSelected}
                  indeterminate={partiallySelected}
                  disabled={isRevoking}
                  onCheckedChange={setCurrentPageSelected}
                  label="選取目前頁面的所有社員註冊序號"
                />
              </TableHead>
              <TableHead>社員註冊序號</TableHead>
              <TableHead>學年度</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>建立時間</TableHead>
              <TableHead>使用時間</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registerKeys.map((registerKey) => (
              <TableRow key={registerKey.id}>
                <TableCell className="w-12">
                  <AdminSelectionCheckbox
                    checked={selectedIds.has(registerKey.id)}
                    disabled={isRevoking}
                    onCheckedChange={(checked) => setRegisterKeySelected(registerKey.id, checked)}
                    label={`選取社員註冊序號 ${registerKey.register_key}`}
                  />
                </TableCell>
                <TableCell className="min-w-64">
                  <p className="break-all font-mono text-xs text-(--text-primary)">
                    {registerKey.register_key}
                  </p>
                  <p className="mt-1 text-xs text-(--text-muted)">
                    序號 #{registerKey.sequence_number}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {registerKey.academic_year?.year ?? "未知"} 學年度
                </TableCell>
                <TableCell>
                  <RegisterKeyStatusBadge status={registerKey.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatAdminDateTime(registerKey.created_at)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatAdminDateTime(registerKey.claimed_at)}
                </TableCell>
                <TableCell className="text-right">
                  <RegisterKeyActions
                    registerKey={registerKey}
                    isRevoking={isRevoking}
                    onCopy={copyRegisterKey}
                    onRevoke={setPendingRevocation}
                    className="justify-end"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminListSection>

      <ConfirmDialog
        open={pendingRevocation !== null}
        onClose={() => !isRevoking && setPendingRevocation(null)}
        onConfirm={revokeRegisterKey}
        isSubmitting={isRevoking}
        title="撤銷社員註冊序號"
        description={
          pendingRevocation
            ? `確定要撤銷「${pendingRevocation.register_key}」嗎？撤銷後無法再用於建立社員資格。`
            : ""
        }
        confirmLabel="撤銷序號"
      />
      <ConfirmDialog
        open={isBulkRevokeDialogOpen}
        onClose={() => !isRevoking && setIsBulkRevokeDialogOpen(false)}
        onConfirm={bulkRevokeRegisterKeys}
        isSubmitting={isRevoking}
        title="批次撤銷社員註冊序號"
        description={`確定要撤銷已選取的 ${selectedCount} 組社員註冊序號嗎？撤銷後無法再用於建立社員資格。`}
        confirmLabel="撤銷已選序號"
      />
    </div>
  );
}

function RegisterKeyActions({
  registerKey,
  isRevoking,
  onCopy,
  onRevoke,
  className,
}: {
  registerKey: MembershipRegisterKeyWithAcademicYear;
  isRevoking: boolean;
  onCopy: (registerKey: string) => void;
  onRevoke: (registerKey: MembershipRegisterKeyWithAcademicYear) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isRevoking}
        onClick={() => onCopy(registerKey.register_key)}
      >
        複製
      </Button>
      {registerKey.status === "available" ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={isRevoking}
          onClick={() => onRevoke(registerKey)}
        >
          撤銷
        </Button>
      ) : null}
    </div>
  );
}
