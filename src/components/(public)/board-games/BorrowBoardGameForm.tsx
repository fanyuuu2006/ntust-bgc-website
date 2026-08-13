"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/libs/api/errors";
import { apiClient } from "@/libs/api/client";
import { FormFeedback } from "@/components/FormFeedback";

type BorrowBoardGameFormProps = {
  boardGameId: string;
};

export function BorrowBoardGameForm({ boardGameId }: BorrowBoardGameFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient<{ data: { id: string } }>(`/api/board-games/${boardGameId}/borrow`, {
        method: "POST",
        body: {},
      });

      setSuccess("借用申請已送出，請等待幹部審核。")
      router.refresh();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError("申請借用失敗，請稍後再試。")
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="btn primary w-full rounded-xl px-4 py-3 text-sm font-semibold sm:text-base"
      >
        {isSubmitting ? "送出申請中..." : "送出借用申請"}
      </button>

      <FormFeedback error={error} success={success} className="min-h-0" />
    </div>
  );
}
