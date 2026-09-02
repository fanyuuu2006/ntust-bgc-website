"use client";

import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  isSubmitting?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "刪除",
  confirmVariant = "danger",
  isSubmitting = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          取消
        </Button>
        <Button type="button" variant={confirmVariant} onClick={onConfirm} isLoading={isSubmitting}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
