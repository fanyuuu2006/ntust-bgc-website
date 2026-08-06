"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/libs/api/client";
import { ApiError } from "@/libs/api/errors";
import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";
import { cn } from "@/utils/className";

const MENU_ITEM_CLASS =
  "flex w-full items-center justify-center px-3.5 py-2 text-sm transition";

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
    <div
      className="relative flex shrink-0 flex-col items-center justify-center"
      ref={menuRef}
    >
      <button
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-label={`「${boardGameName}」的操作選單`}
        className="flex size-8 shrink-0 items-center justify-center text-lg text-(--muted)"
      >
        ⋮
      </button>

      {isMenuOpen && (
        <div
          role="menu"
          className="card absolute top-[calc(100%+0.5rem)] right-0 z-5 min-w-28 overflow-hidden rounded-xl"
        >
          <Link
            href={`/admin/board-games/${boardGameId}/edit`}
            role="menuitem"
            className={cn(MENU_ITEM_CLASS, "hover:bg-(--secondary-background)")}
          >
            編輯
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              MENU_ITEM_CLASS,
              "text-(--game-red) hover:bg-(--game-red)/10",
            )}
          >
            {isDeleting ? "刪除中…" : "刪除"}
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-1 max-w-36 text-right text-xs text-(--game-red)"
        >
          {error}
        </p>
      )}
    </div>
  );
}
