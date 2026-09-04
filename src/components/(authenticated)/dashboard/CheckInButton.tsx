"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { EventAttendance } from "@/types/database";

type CheckInResponse = { data: EventAttendance };

export function CheckInButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkIn() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient<CheckInResponse>(`/api/events/${eventId}/check-in`, {
        method: "POST",
      });
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        router.refresh();
        return;
      }
      setError(caught instanceof Error ? caught.message : "簽到失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="shrink-0">
      <Button type="button" isLoading={isSubmitting} disabled={isSubmitting} onClick={checkIn}>
        簽到
      </Button>
      <FormFeedback className="mt-2" error={error} />
    </div>
  );
}
