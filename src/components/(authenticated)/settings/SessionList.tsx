"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { formatRelativeTime } from "@/utils/date";
import { SessionSummary } from "@/services/auth/auth.types";
import { FormFeedback } from "@/components/FormFeedback";
import { cn } from "@/utils/className";
import { Button } from "@/components/ui/Button";
type SessionListProps = { sessions: SessionSummary[] };
export const SessionList = ({ sessions }: SessionListProps) => {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  async function handleRevoke(id: string) {
    setError(null);
    setPendingId(id);
    try {
      await apiClient(`/api/auth/sessions/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "登出裝置失敗，請稍後再試",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function handleRevokeOthers() {
    setError(null);
    setPendingId("others");
    try {
      await apiClient("/api/auth/sessions", { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "登出其他裝置失敗，請稍後再試",
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3" aria-label="已登入裝置清單">
        {sessions.map((session) => (
          <li
            key={session.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
              session.is_current
                ? "border-(--interactive-primary) bg-(--surface-subtle)"
                : "border-(--border-default) bg-(--surface-default)",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  session.is_current
                    ? "bg-(--status-success)"
                    : "bg-(--status-neutral)"
                }`}
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-(--text-primary)">
                  {session.is_current ? "目前使用中的裝置" : "其他裝置"}
                </span>
                <time
                  className="text-xs text-(--text-muted)"
                  dateTime={session.last_accessed_at}
                >
                  最後活動：{formatRelativeTime(session.last_accessed_at)}
                </time>
              </div>
            </div>

            {!session.is_current && (
              <Button
                type="button"
                onClick={() => handleRevoke(session.id)}
                disabled={pendingId === session.id}
                variant="outline"
                isLoading={pendingId === session.id}
                className="w-full px-4 py-1.5 text-xs sm:w-auto"
              >
                {pendingId === session.id ? "登出中..." : "登出"}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <FormFeedback error={error} />

      {otherSessionsCount > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleRevokeOthers}
            disabled={pendingId === "others"}
            variant="danger"
            isLoading={pendingId === "others"}
            className="w-full px-6 py-2.5 sm:w-auto sm:text-base"
          >
            {pendingId === "others" ? "登出中..." : "登出所有其他裝置"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-(--text-muted) sm:text-right">
          目前沒有其他登入中的裝置
        </p>
      )}
    </div>
  );
};
