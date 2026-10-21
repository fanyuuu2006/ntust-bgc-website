"use client";

import { Heart } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { ReviewLikeResult } from "@/services/reviews/reviews.types";

type LikeEligibility = "anonymous" | "unverified" | "verified" | "unavailable";

const disabledLabels: Record<Exclude<LikeEligibility, "verified">, string> = {
  anonymous: "登入後可按讚",
  unverified: "完成 Email 驗證後可按讚",
  unavailable: "目前無法按讚",
};

export function ReviewLikeButton({ boardGameId, reviewId, initialLikeCount, initialLikedByMe, eligibility }: {
  boardGameId: string;
  reviewId: string;
  initialLikeCount: number;
  initialLikedByMe: boolean;
  eligibility: LikeEligibility;
}) {
  const router = useRouter();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const enabled = eligibility === "verified";
  const label = enabled
    ? likedByMe ? "取消按讚" : "按讚"
    : disabledLabels[eligibility];

  async function toggleLike() {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await apiClient<{ data: ReviewLikeResult }>(
        `/api/board-games/${boardGameId}/reviews/${reviewId}/like`,
        { method: "PUT", body: { liked: !likedByMe } },
      );
      setLikeCount(response.data.likeCount);
      setLikedByMe(response.data.likedByMe);
      // 熱門排序可能因此改變；刷新 Server Component 取得資料庫的權威頁序，不重載整頁。
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "更新按讚狀態失敗，請稍後再試");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="ghost"
        size="none"
        disabled={!enabled}
        isLoading={busy}
        aria-pressed={enabled ? likedByMe : undefined}
        aria-label={`${label}，目前 ${likeCount.toLocaleString("zh-TW")} 個讚`}
        title={label}
        onClick={toggleLike}
        className={likedByMe
          ? "min-h-11 min-w-11 px-3 py-2 text-xs text-(--interactive-primary)"
          : "min-h-11 min-w-11 px-3 py-2 text-xs text-(--text-muted)"}
      >
        <Heart aria-hidden="true" className="size-4" fill={likedByMe ? "currentColor" : "none"} />
        <span className="tabular-nums">{likeCount.toLocaleString("zh-TW")}</span>
      </Button>
      <FormFeedback error={error} className={error ? "mt-1" : "sr-only"} />
    </div>
  );
}
