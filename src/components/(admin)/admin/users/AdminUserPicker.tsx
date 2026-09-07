"use client";

import { useId, useReducer } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/libs/api/client";
import type { AdminUserPickerItem } from "@/services/users/users.types";
import {
  adminUserPickerReducer,
  createAdminUserPickerState,
  getAdminUserPickerIdentity,
} from "./adminUserPickerState";

type AdminUserPickerProps = {
  id?: string;
  name?: string;
  disabled?: boolean;
  onChange: (user: AdminUserPickerItem | null) => void;
};

export function AdminUserPicker({
  id,
  name = "user_id",
  disabled = false,
  onChange,
}: AdminUserPickerProps) {
  const generatedInputId = useId();
  const inputId = id ?? generatedInputId;
  const [state, dispatch] = useReducer(
    adminUserPickerReducer,
    undefined,
    createAdminUserPickerState,
  );
  const hasOpenResultPanel = Boolean(
    state.error || (state.hasSearched && !state.isSearching),
  );

  async function searchUsers() {
    const search = state.searchText.trim();
    if (!search || state.isSearching) return;

    dispatch({ type: "search_started" });
    try {
      const response = await apiClient<{ data: AdminUserPickerItem[] }>(
        `/api/admin/users/search?search=${encodeURIComponent(search)}`,
      );
      dispatch({ type: "search_succeeded", candidates: response.data });
    } catch {
      dispatch({ type: "search_failed", message: "搜尋使用者失敗，請稍後再試" });
    }
  }

  function selectUser(user: AdminUserPickerItem) {
    dispatch({ type: "user_selected", user });
    onChange(user);
  }

  function clearSelection() {
    dispatch({ type: "selection_cleared" });
    onChange(null);
  }

  return (
    <div
      className="relative space-y-2"
      onKeyDown={(event) => {
        if (event.key === "Escape" && hasOpenResultPanel) {
          event.preventDefault();
          event.stopPropagation();
          dispatch({ type: "candidates_dismissed" });
        }
      }}
    >
      <input type="hidden" name={name} value={state.selectedUserId ?? ""} />

      {state.selectedUser && !state.isChoosing ? (
        <SelectedUser
          user={state.selectedUser}
          disabled={disabled}
          onChange={() => dispatch({ type: "change_requested" })}
          onClear={clearSelection}
        />
      ) : (
        <>
          {state.selectedUser ? (
            <p className="text-xs text-(--text-muted)">
              目前選擇：{getAdminUserPickerIdentity(state.selectedUser).primary}
            </p>
          ) : null}
          <label htmlFor={inputId} className="sr-only">
            搜尋使用者
          </label>
          <div className="flex min-w-0 gap-2">
            <Input
              id={inputId}
              value={state.searchText}
              disabled={disabled || state.isSearching}
              placeholder="搜尋姓名、使用者名稱、學號或 Email"
              className="min-w-0 flex-1"
              onChange={(event) =>
                dispatch({ type: "search_changed", value: event.target.value })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchUsers();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              isLoading={state.isSearching}
              onClick={() => void searchUsers()}
            >
              搜尋
            </Button>
          </div>

          {hasOpenResultPanel ? (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 max-w-full overflow-y-auto rounded-lg border border-(--border-default) bg-(--surface-elevated) shadow-(--shadow-card)">
              {state.error ? (
                <p role="alert" className="px-3 py-2 text-sm text-(--status-danger)">
                  {state.error}
                </p>
              ) : state.candidates.length > 0 ? (
                <ul aria-label="搜尋結果" className="divide-y divide-(--border-default)">
                  {state.candidates.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        className="min-h-11 w-full px-3 py-2 text-left transition-colors hover:bg-(--surface-subtle) focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--focus-ring)"
                        onClick={() => selectUser(user)}
                      >
                        <UserIdentity user={user} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-(--text-muted)">
                  找不到符合條件的使用者
                </p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function SelectedUser({
  user,
  disabled,
  onChange,
  onClear,
}: {
  user: AdminUserPickerItem;
  disabled: boolean;
  onChange: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3">
      <p className="mb-1 text-xs font-medium text-(--text-muted)">已選擇</p>
      <UserIdentity user={user} />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onChange}>
          更換
        </Button>
        <Button type="button" size="sm" variant="text" disabled={disabled} onClick={onClear}>
          清除選擇
        </Button>
      </div>
    </div>
  );
}

function UserIdentity({ user }: { user: AdminUserPickerItem }) {
  const { primary, secondary } = getAdminUserPickerIdentity(user);

  return (
    <span className="block min-w-0 text-sm leading-5">
      <span className="block break-words font-semibold text-(--text-primary)">
        {primary}
      </span>
      {secondary ? (
        <span className="block text-xs leading-4 text-(--text-secondary) [overflow-wrap:anywhere]">
          {secondary}
        </span>
      ) : null}
    </span>
  );
}
