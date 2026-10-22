"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormFeedback } from "@/components/FormFeedback";
import { useToast } from "@/contexts/ToastContext";
import { Select } from "@/components/ui/Select";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { ProfileVisibility } from "@/types/database";

export function PublicProfileSettings({
  initialVisibility,
  initialOptedIn,
}: {
  initialVisibility: ProfileVisibility;
  initialOptedIn: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [visibility, setVisibility] = useState(initialVisibility);
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [busyField, setBusyField] = useState<"visibility" | "ranking" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const visibilityDescription = visibility === "public"
    ? "其他人可查看你的公開身份、社團足跡與評論紀錄。"
    : "其他人只能查看你的顯示名稱與頭像。";

  async function updateVisibility(nextValue: ProfileVisibility) {
    const previous = visibility;
    setBusyField("visibility");
    setError(null);
    setVisibility(nextValue);
    try {
      await apiClient("/api/users/me/profile-visibility", {
        method: "PATCH",
        body: { visibility: nextValue },
      });
      showToast("success", "設定已更新");
      router.refresh();
    } catch (cause) {
      setVisibility(previous);
      setError(cause instanceof ApiError ? cause.message : "更新個人檔案可見性失敗，請稍後再試");
    } finally {
      setBusyField(null);
    }
  }

  async function updatePreference(nextValue: boolean) {
    setBusyField("ranking");
    setError(null);
    try {
      await apiClient("/api/users/me/public-ranking-preference", {
        method: "PATCH",
        body: { optedIn: nextValue },
      });
      setOptedIn(nextValue);
      showToast("success", "設定已更新");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "更新排行榜參與設定失敗，請稍後再試");
    } finally {
      setBusyField(null);
    }
  }

  return (
    <section className="mt-5 border-t border-(--border-default) pt-5" aria-labelledby="public-profile-settings-title">
      <div className="min-w-0">
        <h3 id="public-profile-settings-title" className="font-semibold text-(--text-primary)">隱私與公開設定</h3>
        <p className="mt-1 text-sm leading-6 text-(--text-muted)">
          管理個人檔案的公開範圍與排行榜參與方式。
        </p>
      </div>
      <div className="mt-4">
        <label htmlFor="profile-visibility" className="block font-medium text-(--text-primary)">個人檔案可見性</label>
        <Select
          id="profile-visibility"
          value={visibility}
          disabled={busyField !== null}
          aria-describedby="profile-visibility-description"
          onChange={(event) => void updateVisibility(event.target.value as ProfileVisibility)}
          className="mt-2 w-full sm:max-w-xs"
        >
          <option value="public">公開</option>
          <option value="limited">限制</option>
        </Select>
        <p id="profile-visibility-description" className="mt-2 text-sm leading-6 text-(--text-muted)">
          {visibilityDescription}
        </p>
      </div>
      <div className="mt-4 flex min-w-0 flex-col gap-3 border-t border-(--border-muted) pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h4 id="public-ranking-preference-title" className="font-medium text-(--text-primary)">顯示在評論貢獻排行</h4>
          <p id="public-ranking-preference-description" className="mt-1 text-sm leading-6 text-(--text-muted)">
            開啟後，其他人就能在排行榜上看到你；關閉後則不會顯示。
          </p>
        </div>
        <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 self-start text-sm font-medium text-(--text-primary)">
          <input
            type="checkbox"
            role="switch"
            checked={optedIn}
            disabled={busyField !== null}
            aria-describedby="public-ranking-preference-description"
            onChange={(event) => void updatePreference(event.target.checked)}
            className="size-5 accent-(--interactive-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
          />
          <span>{optedIn ? "參與中" : "未參與"}</span>
        </label>
      </div>
      <p className="mt-3 text-sm leading-6 text-(--text-muted)">
        個人檔案可見性不會影響你已發表的公開評論。
      </p>
      <FormFeedback error={error} className="mt-3" />
    </section>
  );
}
