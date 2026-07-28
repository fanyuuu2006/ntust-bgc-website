"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { formatRelativeTime } from "@/utils/date";
import { SessionSummary } from "@/services/auth/auth.types";
import { FormFeedback } from "@/components/FormFeedback";
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
            className="flex flex-col gap-3 rounded-lg border border-(--border) bg-(--primary-background) p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  session.is_current ? "bg-(--secondary)" : "bg-(--muted)"
                }`}
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium text-(--foreground)">
                  {session.is_current ? "目前使用中的裝置" : "其他裝置"}
                </span>
                <span className="text-xs text-(--muted)">
                  最後活動：{formatRelativeTime(session.last_accessed_at)}
                </span>
              </div>
            </div>

            {!session.is_current && (
              <button
                type="button"
                onClick={() => handleRevoke(session.id)}
                disabled={pendingId === session.id}
                aria-busy={pendingId === session.id}
                className="btn outline w-full rounded-lg px-4 py-1.5 text-xs font-medium sm:w-auto"
              >
                {pendingId === session.id ? "登出中..." : "登出"}
              </button>
            )}
          </li>
        ))}
      </ul>

      <FormFeedback error={error} />

      {otherSessionsCount > 0 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRevokeOthers}
            disabled={pendingId === "others"}
            aria-busy={pendingId === "others"}
            className="btn danger w-full rounded-lg px-6 py-2.5 text-sm font-medium sm:w-auto sm:text-base"
          >
            {pendingId === "others" ? "登出中..." : "登出所有其他裝置"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-(--muted) sm:text-right">
          目前沒有其他登入中的裝置
        </p>
      )}
    </div>
  );
};
