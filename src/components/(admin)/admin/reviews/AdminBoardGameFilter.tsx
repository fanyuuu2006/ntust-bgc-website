"use client";

import { useId, useReducer } from "react";
import { X } from "lucide-react";

import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/libs/api/client";
import {
  adminBoardGamePickerReducer,
  createAdminBoardGamePickerState,
} from "./adminBoardGamePickerState";

export type AdminBoardGameFilterValue = {
  id: string;
  name: string;
  inventoryNumber: number;
};

export function AdminBoardGameFilter({
  selected,
  name = "boardGameId",
  id,
}: {
  selected: AdminBoardGameFilterValue | null;
  name?: string;
  id?: string;
}) {
  const generatedInputId = useId();
  const inputId = id ?? generatedInputId;
  const [state, dispatch] = useReducer(
    adminBoardGamePickerReducer,
    selected,
    createAdminBoardGamePickerState,
  );

  async function findBoardGames() {
    const keyword = state.searchText.trim();
    if (!keyword || state.isSearching) return;
    dispatch({ type: "search_started" });
    try {
      const response = await apiClient<{ data: AdminBoardGameFilterValue[] }>(
        `/api/admin/board-games/search?search=${encodeURIComponent(keyword)}`,
      );
      dispatch({ type: "search_succeeded", candidates: response.data });
    } catch {
      dispatch({ type: "search_failed", message: "搜尋桌遊失敗，請稍後再試" });
    }
  }

  return (
    <div
      className="relative min-w-0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && state.open) {
          event.preventDefault();
          event.stopPropagation();
          dispatch({ type: "dismissed" });
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          dispatch({ type: "dismissed" });
        }
      }}
    >
      <input type="hidden" name={state.selected ? name : undefined} value={state.selected?.id ?? ""} />
      {state.selected ? (
        <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-default) pl-3 pr-1">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium" title={state.selected.name}>
              {state.selected.name}
            </span>
            <span className="block text-xs text-(--text-muted)">
              社產編號 #{state.selected.inventoryNumber}
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            iconOnly
            aria-label={`清除桌遊篩選：${state.selected.name}`}
            onClick={() => dispatch({ type: "cleared" })}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : (
        <>
          <label htmlFor={inputId} className="sr-only">
            搜尋桌遊名稱或社產編號
          </label>
          <div className="flex min-w-0 gap-2">
            <ClearableSearchInput
              id={inputId}
              value={state.searchText}
              placeholder="搜尋桌遊名稱或社產編號"
              className="min-w-0 flex-1"
              aria-label="搜尋桌遊名稱或社產編號"
              onValueChange={(value) => dispatch({ type: "search_changed", value })}
              onClear={() => dispatch({ type: "dismissed" })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void findBoardGames();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              isLoading={state.isSearching}
              onClick={() => void findBoardGames()}
            >
              搜尋
            </Button>
          </div>
          {state.open ? (
            <div className="absolute right-0 left-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-(--border-default) bg-(--surface-elevated) shadow-(--shadow-card)">
              {state.error ? (
                <p role="alert" className="px-3 py-2 text-sm text-(--status-danger)">
                  {state.error}
                </p>
              ) : state.candidates.length ? (
                <ul aria-label="桌遊搜尋結果" className="divide-y divide-(--border-default)">
                  {state.candidates.map((game) => (
                    <li key={game.id}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-(--surface-subtle) focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--focus-ring)"
                        onClick={() => dispatch({ type: "selected", value: game })}
                      >
                        <span className="min-w-0 flex-1 truncate" title={game.name}>
                          {game.name}
                        </span>
                        <span className="shrink-0 text-xs text-(--text-muted)">
                          #{game.inventoryNumber}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-(--text-muted)">
                  找不到符合條件的桌遊
                </p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
