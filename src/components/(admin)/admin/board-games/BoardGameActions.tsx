// src/components/(admin)/admin/board-games/BoardGameActions.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";

type BoardGameActionsProps = {
  boardGameId: string;
  boardGameName: string;
};

export function BoardGameActions({
  boardGameId,
  boardGameName,
}: BoardGameActionsProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  async function handleDelete() {
    const confirmed = window.confirm(
      `確定要刪除「${boardGameName}」嗎？此操作無法復原。`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await apiClient(`/api/admin/board-games/${boardGameId}`, {
        method: "DELETE",
      });
      setIsMenuOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "刪除失敗，請稍後再試");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="relative flex items-center justify-end gap-1.5"
      ref={menuRef}
    >
      <Link
        href={`/admin/board-games/${boardGameId}/edit`}
        className="btn outline h-8 rounded-md px-3 text-xs"
      >
        編輯
      </Link>

      <button
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label="更多操作"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-(--border) text-(--muted) transition hover:border-(--primary) hover:text-(--primary)"
      >
        ⋯
      </button>

      {isMenuOpen && (
        <div
          role="menu"
          className="card absolute top-[calc(100%+0.25rem)] right-0 z-10 w-28 rounded-md py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            disabled={isDeleting}
            className="block w-full px-3 py-1.5 text-left text-sm text-(--game-red) transition hover:bg-(--secondary-background) disabled:opacity-50"
          >
            {isDeleting ? "刪除中…" : "刪除"}
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="absolute top-full right-0 mt-1 w-36 text-right text-xs text-(--game-red)"
        >
          {error}
        </p>
      )}
    </div>
  );
}
