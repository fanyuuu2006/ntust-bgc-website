"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { SessionSummary } from "@/services/auth/auth.types";
import { formatCompactDateTimeRange, formatDateTime, formatRelativeTime } from "@/utils/date";

type SessionListProps = {
  sessions: SessionSummary[];
};

type RevokeTarget =
  | { type: "session"; session: SessionSummary }
  | { type: "others" }
  | null;

export function SessionList({ sessions }: SessionListProps) {
  const router = useRouter();
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const otherSessionsCount = sessions.filter((session) => !session.is_current).length;

  function requestSessionRevoke(session: SessionSummary) {
    setError(null);
    setSuccess(null);
    setRevokeTarget({ type: "session", session });
  }

  function requestOtherSessionsRevoke() {
    setError(null);
    setSuccess(null);
    setRevokeTarget({ type: "others" });
  }

  function closeDialog() {
    if (!pendingId) setRevokeTarget(null);
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;

    const targetId =
      revokeTarget.type === "session" ? revokeTarget.session.id : "others";
    setPendingId(targetId);
    setError(null);
    setSuccess(null);

    try {
      if (revokeTarget.type === "session") {
        await apiClient(`/api/auth/sessions/${revokeTarget.session.id}`, {
          method: "DELETE",
        });
        setSuccess("已撤銷登入工作階段");
      } else {
        await apiClient("/api/auth/sessions", { method: "DELETE" });
        setSuccess("已撤銷其他登入工作階段");
      }
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "撤銷登入工作階段失敗，請稍後再試",
      );
    } finally {
      setPendingId(null);
      setRevokeTarget(null);
    }
  }

  const isRevoking = pendingId !== null;
  const isRevokingOthers = pendingId === "others";

  return (
    <div className="min-w-0">
      <ul
        className="divide-y divide-(--border-muted) overflow-hidden rounded-xl border border-(--border-default) bg-(--surface-default)"
        aria-label="登入工作階段清單"
      >
        {sessions.map((session) => {
          const compactDates = formatCompactDateTimeRange(session.created_at, session.expires_at);
          return (
          <li
            key={session.id}
            className={`min-w-0 px-3 py-2 sm:px-4 sm:py-3 ${
              session.is_current ? "bg-(--surface-subtle)" : ""
            }`}
          >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:gap-x-3">
                <p className="text-sm font-semibold text-(--text-primary)">
                  {session.is_current ? "目前使用中" : "其他登入工作階段"}
                </p>
                {session.is_current ? <Badge tone="success" className="shrink-0">目前工作階段</Badge> : (
                  <Button type="button" variant="danger" size="sm"
                    onClick={() => requestSessionRevoke(session)} disabled={isRevoking}
                    className="min-h-10 shrink-0 px-2 sm:px-3">
                    撤銷
                  </Button>
                )}
              </div>
              <div aria-label="工作階段時間" className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0 text-sm text-(--text-muted) wrap-anywhere sm:gap-y-1">
                <span className="basis-full sm:basis-auto">最後活動：{formatRelativeTime(session.last_accessed_at)}</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <time dateTime={session.created_at} className="whitespace-nowrap sm:whitespace-normal">
                  <span className="sm:hidden">建立 {compactDates.start}</span><span className="hidden sm:inline">建立於 {formatDateTime(session.created_at)}</span>
                </time>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <time dateTime={session.expires_at} className="whitespace-nowrap sm:whitespace-normal">
                  <span className="sm:hidden">到期 {compactDates.end}</span><span className="hidden sm:inline">到期 {formatDateTime(session.expires_at)}</span>
                </time>
              </div>
          </li>
        );})}
      </ul>

      <FormFeedback error={error} success={success} className="mt-3" />

      {otherSessionsCount > 0 ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={requestOtherSessionsRevoke}
            disabled={isRevoking}
            className="min-h-10 max-w-full whitespace-normal"
          >
            撤銷其他登入工作階段
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-(--text-muted)">
          目前沒有其他登入工作階段
        </p>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={closeDialog}
        onConfirm={confirmRevoke}
        isSubmitting={isRevoking}
        title={
          revokeTarget?.type === "others"
            ? "確認撤銷其他登入工作階段"
            : "確認撤銷登入工作階段"
        }
        description={
          revokeTarget?.type === "others"
            ? "其他裝置上的登入工作階段將被撤銷，需要重新登入。"
            : "這個登入工作階段將被撤銷；若該裝置仍需使用，必須重新登入。"
        }
        confirmLabel={isRevokingOthers ? "撤銷中…" : "確認撤銷"}
        confirmVariant="danger"
      />
    </div>
  );
}
