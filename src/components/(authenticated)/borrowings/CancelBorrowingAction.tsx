"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import type { BoardGameBorrowing } from "@/types/database";

type CancelBorrowingResponse = { data: BoardGameBorrowing };

export function CancelBorrowingAction({
  borrowingId,
  boardGameName,
}: {
  borrowingId: number;
  boardGameName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelBorrowing() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient<CancelBorrowingResponse>(
        `/api/users/me/borrowings/${borrowingId}/cancel`,
        { method: "POST" },
      );
      setOpen(false);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setOpen(false);
        router.refresh();
        return;
      }
      setError(caught instanceof Error ? caught.message : "取消借用申請失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="danger"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        取消申請
      </Button>
      <FormFeedback error={error} />
      <ConfirmDialog
        open={open}
        onClose={() => {
          if (!isSubmitting) setOpen(false);
        }}
        onConfirm={cancelBorrowing}
        isSubmitting={isSubmitting}
        title="取消借用申請"
        description={`確定要取消「${boardGameName}」的借用申請嗎？取消後若仍需要借用，需要重新提出申請。`}
        confirmLabel="確認取消"
        confirmVariant="danger"
      />
    </div>
  );
}
