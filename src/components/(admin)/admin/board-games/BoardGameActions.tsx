"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Button, ButtonLink } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";

type BoardGameActionsProps = {
  boardGameId: string;
  boardGameName: string;
};

export function BoardGameActions({
  boardGameId,
  boardGameName,
}: BoardGameActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);

    try {
      await apiClient(`/api/admin/board-games/${boardGameId}`, {
        method: "DELETE",
      });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "刪除桌遊失敗，請稍後再試。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <ButtonLink
          href={`/admin/board-games/${boardGameId}/edit`}
          variant="outline"
          size="sm"
          className="rounded-lg"
        >
          編輯
        </ButtonLink>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="rounded-lg"
          onClick={() => setOpen(true)}
        >
          刪除
        </Button>
      </div>

      <FormFeedback error={error} className="max-w-40 text-right text-xs" />

      <ConfirmDialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        onConfirm={remove}
        isSubmitting={busy}
        title="刪除桌遊？"
        description={`確定要刪除「${boardGameName}」嗎？若仍有未結束的借用流程，系統會拒絕刪除。`}
      />
    </div>
  );
}
