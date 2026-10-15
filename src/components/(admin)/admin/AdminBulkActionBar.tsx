"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/className";

type ResponsiveBreakpoint = "lg" | "xl";

const responsiveClasses: Record<
  ResponsiveBreakpoint,
  { mobileOnly: string; desktopOnly: string }
> = {
  lg: {
    mobileOnly: "lg:hidden",
    desktopOnly: "hidden lg:flex",
  },
  xl: {
    mobileOnly: "xl:hidden",
    desktopOnly: "hidden xl:flex",
  },
};

export function AdminBulkActionBar({
  selectedCount,
  disabled = false,
  onClear,
  selectionControl,
  children,
  notice,
  className,
  mobilePresentation = "inline",
  mobileActionLabel = "批次操作",
  desktopBreakpoint = "lg",
  mobileActions,
  mobileNotice,
}: {
  selectedCount: number;
  disabled?: boolean;
  onClear: () => void;
  selectionControl?: ReactNode;
  children: ReactNode;
  notice?: ReactNode;
  className?: string;
  mobilePresentation?: "inline" | "panel";
  mobileActionLabel?: string;
  desktopBreakpoint?: ResponsiveBreakpoint;
  mobileActions?: ReactNode;
  mobileNotice?: ReactNode;
}) {
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const panelId = useId();
  const panelRootRef = useRef<HTMLDivElement>(null);
  const panelTriggerRef = useRef<HTMLButtonElement>(null);
  const breakpoint = responsiveClasses[desktopBreakpoint];

  useEffect(() => {
    if (!isMobilePanelOpen || mobilePresentation !== "panel") return;

    function handlePointerDown(event: PointerEvent) {
      if (!panelRootRef.current?.contains(event.target as Node)) {
        setIsMobilePanelOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      event.preventDefault();
      setIsMobilePanelOpen(false);
      panelTriggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobilePanelOpen, mobilePresentation]);

  if (selectedCount === 0) return null;

  if (mobilePresentation === "panel") {
    return (
      <div className={cn("min-w-0", className)} role="region" aria-label="批次操作">
        <div
          ref={panelRootRef}
          className={cn(
            "min-w-0 border-y border-(--border-default) bg-(--surface-subtle) px-1 py-2 sm:px-2",
            breakpoint.mobileOnly,
          )}
        >
          <div className="flex justify-end">
            <Button
              ref={panelTriggerRef}
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled && !isMobilePanelOpen}
              aria-expanded={isMobilePanelOpen}
              aria-controls={panelId}
              onClick={() => {
                if (disabled && !isMobilePanelOpen) return;
                setIsMobilePanelOpen((current) => !current);
              }}
            >
              {mobileActionLabel}
              <span aria-hidden="true">{isMobilePanelOpen ? "▴" : "▾"}</span>
            </Button>
          </div>
          {isMobilePanelOpen ? (
            <div
              id={panelId}
              className="mt-2 grid w-full min-w-0 gap-3 rounded-xl border border-(--border-default) bg-(--surface-default) p-3"
            >
              {mobileActions ?? children}
              {mobileNotice ?? notice ? (
                <div className="min-w-0 text-sm wrap-anywhere text-(--danger)" role="alert">
                  {mobileNotice ?? notice}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "min-w-0 flex-wrap items-center gap-2 border-y border-(--border-default) bg-(--surface-subtle) px-2 py-2",
            breakpoint.desktopOnly,
          )}
        >
          {selectionControl}
          <p
            className="shrink-0 text-sm font-medium text-(--text-primary)"
            aria-live="polite"
          >
            已選取 {selectedCount} 筆
          </p>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            {children}
            <Button
              type="button"
              size="sm"
              variant="text"
              disabled={disabled}
              onClick={onClear}
            >
              清除選取
            </Button>
          </div>
          {notice ? (
            <div className="basis-full text-sm text-(--danger)" role="alert">
              {notice}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)} role="region" aria-label="批次操作">
      <div
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-2 border-y border-(--border-default) bg-(--surface-subtle) px-1 py-2 sm:px-2",
          breakpoint.mobileOnly,
        )}
      >
        {mobileActions ?? children}
        {mobileNotice ?? notice ? (
          <div className="basis-full min-w-0 wrap-anywhere text-sm text-(--danger)" role="alert">
            {mobileNotice ?? notice}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "min-w-0 flex-wrap items-center gap-2 border-y border-(--border-default) bg-(--surface-subtle) px-2 py-2",
          breakpoint.desktopOnly,
        )}
      >
        {selectionControl}
        <p className="shrink-0 text-sm font-medium text-(--text-primary)" aria-live="polite">
          已選取 {selectedCount} 筆
        </p>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          {children}
          <Button type="button" size="sm" variant="text" disabled={disabled} onClick={onClear}>
            清除選取
          </Button>
        </div>
        {notice ? <div className="basis-full min-w-0 wrap-anywhere text-sm text-(--danger)" role="alert">{notice}</div> : null}
      </div>
    </div>
  );
}
