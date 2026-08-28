"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/libs/api/errors";
import { apiClient } from "@/libs/api/client";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";

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
      await apiClient<{ data: { id: string } }>(
        `/api/board-games/${boardGameId}/borrow`,
        {
          method: "POST",
          body: {},
        },
      );

      setSuccess("借用申請已送出，請等待幹部審核。")
      router.refresh();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError("申請借用失敗，請稍後再試。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        isLoading={isSubmitting}
        className="w-full rounded-xl py-3 sm:text-base"
      >
        {isSubmitting ? "送出申請中..." : "申請借用"}
      </Button>

      <FormFeedback error={error} success={success} className="min-h-0" />
    </div>
  );
}
