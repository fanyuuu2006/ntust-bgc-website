import type { AdminUserPickerItem } from "@/services/users/users.types";

export type AdminUserPickerState = {
  searchText: string;
  candidates: AdminUserPickerItem[];
  selectedUser: AdminUserPickerItem | null;
  selectedUserId: string | null;
  isChoosing: boolean;
  isSearching: boolean;
  hasSearched: boolean;
  error: string | null;
};

type AdminUserPickerAction =
  | { type: "search_changed"; value: string }
  | { type: "search_started" }
  | { type: "search_succeeded"; candidates: AdminUserPickerItem[] }
  | { type: "search_failed"; message: string }
  | { type: "user_selected"; user: AdminUserPickerItem }
  | { type: "change_requested" }
  | { type: "candidates_dismissed" }
  | { type: "selection_cleared" }
  | { type: "reset" };

export function getAdminUserPickerIdentity(user: AdminUserPickerItem) {
  const primary = user.realName?.trim() || user.username || user.email;
  const secondary = [
    primary === user.username ? null : user.username,
    user.studentId,
    primary === user.email ? null : user.email,
  ]
    .filter(Boolean)
    .join(" · ");

  return { primary, secondary };
}

export function createAdminUserPickerState(): AdminUserPickerState {
  return {
    searchText: "",
    candidates: [],
    selectedUser: null,
    selectedUserId: null,
    isChoosing: true,
    isSearching: false,
    hasSearched: false,
    error: null,
  };
}

export function adminUserPickerReducer(
  state: AdminUserPickerState,
  action: AdminUserPickerAction,
): AdminUserPickerState {
  switch (action.type) {
    case "search_changed":
      return {
        ...state,
        searchText: action.value,
        candidates: [],
        hasSearched: false,
        error: null,
      };
    case "search_started":
      return { ...state, isSearching: true, error: null };
    case "search_succeeded":
      return {
        ...state,
        candidates: action.candidates,
        isSearching: false,
        hasSearched: true,
      };
    case "search_failed":
      return {
        ...state,
        candidates: [],
        isSearching: false,
        hasSearched: true,
        error: action.message,
      };
    case "user_selected":
      return {
        ...state,
        selectedUser: action.user,
        selectedUserId: action.user.id,
        candidates: [],
        isChoosing: false,
        error: null,
      };
    case "change_requested":
      return { ...state, candidates: [], isChoosing: true, error: null };
    case "candidates_dismissed":
      return {
        ...state,
        candidates: [],
        hasSearched: false,
        error: null,
      };
    case "selection_cleared":
      return {
        ...state,
        selectedUser: null,
        selectedUserId: null,
        candidates: [],
        isChoosing: true,
        error: null,
      };
    case "reset":
      return createAdminUserPickerState();
  }
}
