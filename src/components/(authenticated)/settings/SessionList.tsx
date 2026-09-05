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
import { formatDateTime, formatRelativeTime } from "@/utils/date";

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
        {sessions.map((session) => (
          <li
            key={session.id}
            className={`flex min-w-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 ${
              session.is_current ? "bg-(--surface-subtle)" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-(--text-primary)">
                  {session.is_current ? "目前使用中" : "其他登入工作階段"}
                </p>
                <Badge tone={session.is_current ? "success" : "neutral"}>
                  {session.is_current ? "目前工作階段" : "其他工作階段"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-(--text-secondary)">
                最後活動：{formatRelativeTime(session.last_accessed_at)}
              </p>
              <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-(--text-muted)">
                <time dateTime={session.created_at}>
                  建立於 {formatDateTime(session.created_at)}
                </time>
                <time dateTime={session.expires_at}>
                  到期於 {formatDateTime(session.expires_at)}
                </time>
              </div>
            </div>

            {!session.is_current ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => requestSessionRevoke(session)}
                disabled={isRevoking}
                className="min-h-10 w-full shrink-0 sm:w-auto"
              >
                撤銷
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <FormFeedback error={error} success={success} className="mt-3" />

      {otherSessionsCount > 0 ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="danger"
            onClick={requestOtherSessionsRevoke}
            disabled={isRevoking}
            className="w-full sm:w-auto"
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
