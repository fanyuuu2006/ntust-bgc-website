"use client";

import { useState } from "react";

export function useCurrentPageSelection<TId extends string | number>(itemIds: TId[]) {
  const scopeKey = JSON.stringify(itemIds);
  const [storedSelection, setStoredSelection] = useState<{
    scopeKey: string;
    ids: Set<TId>;
  }>(() => ({ scopeKey, ids: new Set() }));
  if (storedSelection.scopeKey !== scopeKey) {
    setStoredSelection({ scopeKey, ids: new Set() });
  }
  const currentPageIds = new Set(itemIds);
  const storedSelectedIds =
    storedSelection.scopeKey === scopeKey
      ? storedSelection.ids
      : new Set<TId>();

  const selectedIds = new Set(
    [...storedSelectedIds].filter((id) => currentPageIds.has(id)),
  );
  const selectedCount = selectedIds.size;
  const allSelected =
    currentPageIds.size > 0 && selectedCount === currentPageIds.size;
  const partiallySelected = selectedCount > 0 && !allSelected;

  const setItemSelected = (id: TId, selected: boolean) => {
    if (!currentPageIds.has(id)) return;

    setStoredSelection((currentSelection) => {
      const current =
        currentSelection.scopeKey === scopeKey
          ? currentSelection.ids
          : new Set<TId>();
      const next = new Set(
        [...current].filter((selectedId) => currentPageIds.has(selectedId)),
      );
      if (selected) next.add(id);
      else next.delete(id);
      return { scopeKey, ids: next };
    });
  };

  const setCurrentPageSelected = (selected: boolean) => {
    setStoredSelection({
      scopeKey,
      ids: selected ? new Set(itemIds) : new Set(),
    });
  };

  const clearSelection = () => {
    setStoredSelection({ scopeKey, ids: new Set() });
  };

  return {
    selectedIds,
    selectedCount,
    allSelected,
    partiallySelected,
    setItemSelected,
    setCurrentPageSelected,
    clearSelection,
  };
}
