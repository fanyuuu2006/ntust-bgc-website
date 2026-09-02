"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import type { EventAttendance } from "@/types/database";

type CheckInResponse = { data: EventAttendance };

export function CheckInButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkIn() {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient<CheckInResponse>(`/api/events/${eventId}/check-in`, {
        method: "POST",
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "簽到失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="shrink-0 sm:text-right">
      <Button
        type="button"
        className="w-full sm:w-auto"
        isLoading={isSubmitting}
        disabled={isSubmitting}
        onClick={checkIn}
      >
        簽到
      </Button>
      <FormFeedback className="mt-2 text-left" error={error} />
    </div>
  );
}
