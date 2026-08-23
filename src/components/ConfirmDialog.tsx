"use client";

import { Modal } from "@/components/Modal";

type ConfirmDialogProps = { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel?: string; isSubmitting?: boolean };
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "刪除", isSubmitting = false }: ConfirmDialogProps) {
  return <Modal open={open} onClose={onClose} title={title} description={description}><div className="flex justify-end gap-2"><button type="button" disabled={isSubmitting} onClick={onClose} className="btn outline rounded-lg px-4 py-2 text-sm">取消</button><button type="button" disabled={isSubmitting} onClick={onConfirm} className="btn danger rounded-lg px-4 py-2 text-sm">{isSubmitting ? "處理中…" : confirmLabel}</button></div></Modal>;
}
