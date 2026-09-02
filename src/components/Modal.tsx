"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

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

let bodyScrollLockCount = 0;
let initialBodyOverflow: string | null = null;

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    initialBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  bodyScrollLockCount += 1;
}

function unlockBodyScroll() {
  if (bodyScrollLockCount === 0) return;

  bodyScrollLockCount -= 1;

  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = initialBodyOverflow ?? "";
    initialBodyOverflow = null;
  }
}

function synchronizeDialog(dialog: HTMLDialogElement, open: boolean) {
  if (!dialog.isConnected) return;

  try {
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  } catch (error) {
    if (error instanceof DOMException && error.name === "InvalidStateError") return;

    throw error;
  }
}

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
  const hasBodyScrollLock = useRef(false);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      const activeElement = document.activeElement;
      previouslyFocusedElement.current =
        activeElement instanceof HTMLElement ? activeElement : null;
    }

    synchronizeDialog(dialog, open);

    if (!open && previouslyFocusedElement.current?.isConnected) {
      const trigger = previouslyFocusedElement.current;
      requestAnimationFrame(() => trigger.focus());
      previouslyFocusedElement.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasBodyScrollLock.current) return;

    lockBodyScroll();
    hasBodyScrollLock.current = true;

    return () => {
      if (!hasBodyScrollLock.current) return;

      unlockBodyScroll();
      hasBodyScrollLock.current = false;
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
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <div className={cn("max-h-[75dvh] overflow-y-auto p-5", contentClassName)}>
        {children}
      </div>
    </dialog>
  );
}
