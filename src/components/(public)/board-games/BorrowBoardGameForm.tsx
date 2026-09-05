"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ApiError } from "@/libs/api/errors";
import { apiClient } from "@/libs/api/client";
import { FormFeedback } from "@/components/FormFeedback";
import { Button } from "@/components/ui/Button";
import { clubPolicies } from "@/libs/clubPolicies";

type BorrowBoardGameFormProps = {
  boardGameId: string;
  boardGameName: string;
  showNonCurrentMemberNotice: boolean;
};

export function BorrowBoardGameForm({
  boardGameId,
  boardGameName,
  showNonCurrentMemberNotice,
}: BorrowBoardGameFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) return;

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

      setSuccess("借用申請已送出，請等待幹部審核。");
      setOpen(false);
      router.refresh();
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError("申請借用失敗，請稍後再試。");
      }
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(null);
          setOpen(true);
        }}
        disabled={isSubmitting}
        className="w-full rounded-xl py-3 sm:text-base"
      >
        申請借用
      </Button>

      <FormFeedback error={error} success={success} className="min-h-0" />
      <ConfirmDialog
        open={open}
        onClose={() => {
          if (!isSubmitting) setOpen(false);
        }}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
        title="確認申請借用？"
        description={`你將申請借用「${boardGameName}」。送出後會由幹部確認借用安排。`}
        confirmLabel="確認申請"
        confirmVariant="primary"
      >
        {showNonCurrentMemberNotice ? (
          <p className="flex items-start gap-2 rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3 text-sm leading-6 text-(--text-secondary)">
            <Info
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-(--status-info)"
            />
            {clubPolicies.nonCurrentAcademicYearMemberBorrowingNotice}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
