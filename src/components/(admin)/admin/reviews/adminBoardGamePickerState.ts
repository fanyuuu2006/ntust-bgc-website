import type { AdminBoardGameFilterValue } from "./AdminBoardGameFilter";

export type AdminBoardGamePickerState = {
  searchText: string;
  candidates: AdminBoardGameFilterValue[];
  selected: AdminBoardGameFilterValue | null;
  isSearching: boolean;
  hasSearched: boolean;
  open: boolean;
  error: string | null;
};

export type AdminBoardGamePickerAction =
  | { type: "search_changed"; value: string }
  | { type: "search_started" }
  | { type: "search_succeeded"; candidates: AdminBoardGameFilterValue[] }
  | { type: "search_failed"; message: string }
  | { type: "selected"; value: AdminBoardGameFilterValue }
  | { type: "cleared" }
  | { type: "dismissed" };

export function createAdminBoardGamePickerState(
  selected: AdminBoardGameFilterValue | null,
): AdminBoardGamePickerState {
  return {
    searchText: "",
    candidates: [],
    selected,
    isSearching: false,
    hasSearched: false,
    open: false,
    error: null,
  };
}

export function adminBoardGamePickerReducer(
  state: AdminBoardGamePickerState,
  action: AdminBoardGamePickerAction,
): AdminBoardGamePickerState {
  switch (action.type) {
    case "search_changed":
      return {
        ...state,
        searchText: action.value,
        candidates: [],
        hasSearched: false,
        open: false,
        error: null,
      };
    case "search_started":
      return { ...state, isSearching: true, open: false, error: null };
    case "search_succeeded":
      return {
        ...state,
        candidates: action.candidates,
        isSearching: false,
        hasSearched: true,
        open: true,
        error: null,
      };
    case "search_failed":
      return {
        ...state,
        candidates: [],
        isSearching: false,
        hasSearched: true,
        open: true,
        error: action.message,
      };
    case "selected":
      return {
        ...state,
        searchText: "",
        candidates: [],
        selected: action.value,
        hasSearched: false,
        open: false,
        error: null,
      };
    case "cleared":
      return createAdminBoardGamePickerState(null);
    case "dismissed":
      return { ...state, candidates: [], hasSearched: false, open: false, error: null };
  }
}
