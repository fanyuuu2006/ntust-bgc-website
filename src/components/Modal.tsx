"use client";

import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/className";

type ModalSize = "sm" | "md" | "lg";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: ModalSize;
  className?: string;
  contentClassName?: string;
  closeLabel?: string;
};

const sizeClassNames: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-3xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  className,
  contentClassName,
  closeLabel = "關閉對話框",
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
        "m-auto w-[calc(100%-1rem)] overflow-visible rounded-2xl border border-(--border-default) bg-(--surface-elevated) p-0 text-(--text-primary) shadow-(--shadow-card) backdrop:bg-(--text-primary)/45 sm:w-full",
        sizeClassNames[size],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-(--border-default) px-5 py-4">
        <div>
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-(--text-muted)">
              {description}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onClose}
          aria-label={closeLabel}
          className="shrink-0"
        >
          <span aria-hidden="true">×</span>
        </Button>
      </div>
      <div className={cn("max-h-[75dvh] overflow-y-auto p-5", contentClassName)}>
        {children}
      </div>
    </dialog>
  );
}
