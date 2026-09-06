"use client";

import { Modal } from "@/components/Modal";
import type { ModalSize } from "@/components/Modal";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  size?: ModalSize;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  isSubmitting?: boolean;
  children?: React.ReactNode;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  size,
  confirmLabel = "刪除",
  confirmVariant = "danger",
  isSubmitting = false,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={isSubmitting}
      title={title}
      description={description}
      size={size}
    >
      {children ? <div className="mb-4">{children}</div> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          autoFocus
        >
          取消
        </Button>
        <Button type="button" variant={confirmVariant} onClick={onConfirm} isLoading={isSubmitting}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
