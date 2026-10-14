"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
import type { MembershipRegisterKeyWithAcademicYear } from "@/services/memberships/memberships.types";
import { formatAdminDateTime } from "@/utils/date";
import { RegisterKeyStatusBadge } from "./RegisterKeyStatusBadge";

type RegisterKeyTableProps = {
  registerKeys: MembershipRegisterKeyWithAcademicYear[];
  hasFilters?: boolean;
};

export function RegisterKeyTable({
  registerKeys,
  hasFilters = false,
}: RegisterKeyTableProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingRevocation, setPendingRevocation] =
    useState<MembershipRegisterKeyWithAcademicYear | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const selectedCount = selectedIds.size;
  const allSelected =
    registerKeys.length > 0 && selectedCount === registerKeys.length;
  const partiallySelected = selectedCount > 0 && !allSelected;

  function setRegisterKeySelected(id: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function setCurrentPageSelected(selected: boolean) {
    setSelectedIds(
      selected ? new Set(registerKeys.map((registerKey) => registerKey.id)) : new Set(),
    );
  }

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
      setFeedback(`已複製 ${values.length} 組社員註冊序號。`);
    } catch {
      setFeedback("無法複製已選取的社員註冊序號，請稍後再試。");
    }
  }

  async function copyRegisterKey(registerKey: string) {
    try {
      await navigator.clipboard.writeText(registerKey);
      setFeedback("社員註冊序號已複製。");
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

      setFeedback("社員註冊序號已撤銷。");
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

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-subtle) px-3 py-2">
        <label className="flex items-center gap-2 text-sm text-(--text-primary) lg:hidden">
          <CurrentPageSelectionCheckbox
            checked={allSelected}
            indeterminate={partiallySelected}
            onChange={setCurrentPageSelected}
          />
          選取目前頁面
        </label>
        <p className="mr-auto text-sm text-(--text-secondary)" aria-live="polite">
          已選取 {selectedCount} 筆
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={selectedCount === 0}
          onClick={copySelectedRegisterKeys}
        >
          複製已選序號
        </Button>
        <Button
          type="button"
          variant="text"
          size="sm"
          disabled={selectedCount === 0}
          onClick={() => setSelectedIds(new Set())}
        >
          清除選取
        </Button>
      </div>

      <div className="grid gap-3 lg:hidden">
        {registerKeys.map((registerKey) => (
          <Card key={registerKey.id} className="min-w-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(registerKey.id)}
                  onChange={(event) =>
                    setRegisterKeySelected(registerKey.id, event.target.checked)
                  }
                  aria-label={`選取社員註冊序號 ${registerKey.register_key}`}
                  className="mt-0.5 size-4 shrink-0 rounded border-(--border-default) accent-(--interactive-primary)"
                />
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
            <RegisterKeyActions
              registerKey={registerKey}
              isRevoking={isRevoking}
              onCopy={copyRegisterKey}
              onRevoke={setPendingRevocation}
              className="mt-4"
            />
          </Card>
        ))}
      </div>

      <AdminListSection className="hidden lg:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <CurrentPageSelectionCheckbox
                  checked={allSelected}
                  indeterminate={partiallySelected}
                  onChange={setCurrentPageSelected}
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
                  <input
                    type="checkbox"
                    checked={selectedIds.has(registerKey.id)}
                    onChange={(event) =>
                      setRegisterKeySelected(registerKey.id, event.target.checked)
                    }
                    aria-label={`選取社員註冊序號 ${registerKey.register_key}`}
                    className="size-4 rounded border-(--border-default) accent-(--interactive-primary)"
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
    </div>
  );
}

function CurrentPageSelectionCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      aria-label="選取目前頁面的所有社員註冊序號"
      className="size-4 rounded border-(--border-default) accent-(--interactive-primary)"
    />
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
