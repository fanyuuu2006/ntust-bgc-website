"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/utils/className";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        "m-auto w-[calc(100%-1rem)] max-w-lg overflow-visible rounded-2xl border border-(--border) bg-(--primary-background) p-0 text-(--foreground) shadow-(--shadow-card) backdrop:bg-(--foreground)/45 sm:w-full",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-(--border) px-5 py-4">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          {description && (
            <p
              id={descriptionId}
              className="mt-1 text-sm leading-6 text-(--muted)"
            >
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉對話框"
          className="btn outline shrink-0 rounded-lg px-2.5 py-1.5 text-sm"
        >
          ×
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}
