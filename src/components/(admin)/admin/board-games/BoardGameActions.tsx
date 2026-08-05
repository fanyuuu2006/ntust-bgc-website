"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";
import { cn } from "@/utils/className";

const BASE_CLASS = "px-3 py-1.5 text-sm transition-colors duration-300";
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
  const menuRef = useOutsideDismiss<HTMLDivElement>(isMenuOpen, () =>
    setIsMenuOpen(false),
  );

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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label={`「${boardGameName}」的操作選單`}
      >
        ⋯
      </button>

      {isMenuOpen && (
        <div
          role="menu"
          className="card absolute top-[calc(100%+0.25rem)] right-0 w-28 z-10 flex flex-col rounded-md"
        >
          <Link
            href={`/admin/board-games/${boardGameId}/edit`}
            role="menuitem"
            className={BASE_CLASS}
          >
            編輯
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(BASE_CLASS, "text-(--game-red)")}
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
