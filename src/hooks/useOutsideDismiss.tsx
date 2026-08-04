"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useOutsideDismiss<T extends HTMLElement>(
  isActive: boolean,
  onDismiss: () => void,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isActive) return;

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onDismiss();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive, onDismiss]);

  return ref;
}