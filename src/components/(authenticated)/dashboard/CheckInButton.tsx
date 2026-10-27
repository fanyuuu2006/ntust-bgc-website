"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { EventAttendance } from "@/types/database";
import { useToast } from "@/contexts/ToastContext";

type CheckInResponse = { data: EventAttendance };

export function CheckInButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkIn() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient<CheckInResponse>(`/api/events/${eventId}/check-in`, { method: "POST" });
      showToast("success", "已完成簽到");
      router.refresh();
    } catch (caught) {
      const message = caught instanceof ApiError || caught instanceof Error ? caught.message : "簽到失敗，請稍後再試。";
      setError(message);
      // 409 可能代表活動已取消、簽到時段已關閉或重複簽到；只重新取得狀態，不顯示成功回饋。
      if (caught instanceof ApiError && caught.status === 409) router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return <div className="shrink-0">
    <Button type="button" isLoading={isSubmitting} disabled={isSubmitting} onClick={checkIn}>簽到</Button>
    {error && <FormFeedback className="mt-2" error={error} />}
  </div>;
}
