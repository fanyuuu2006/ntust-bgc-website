"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
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

      <div className="grid gap-3 lg:hidden">
        {registerKeys.map((registerKey) => (
          <Card key={registerKey.id} className="min-w-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs text-(--text-primary)">
                  {registerKey.register_key}
                </p>
                <p className="mt-1 text-xs text-(--text-muted)">
                  {registerKey.academic_year?.year ?? "未知"} 學年度 · 序號 #
                  {registerKey.sequence_number}
                </p>
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

      <Card className="hidden overflow-x-auto p-0 lg:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
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
      </Card>

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
