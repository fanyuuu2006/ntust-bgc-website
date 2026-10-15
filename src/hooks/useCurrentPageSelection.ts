"use client";

import { useMemo, useState } from "react";

export function useCurrentPageSelection<TId extends string | number>(itemIds: TId[]) {
  const [storedSelectedIds, setStoredSelectedIds] = useState<Set<TId>>(
    () => new Set(),
  );
  const currentPageIds = useMemo(() => new Set(itemIds), [itemIds]);
  const selectedIds = useMemo(
    () =>
      new Set(
        [...storedSelectedIds].filter((id) => currentPageIds.has(id)),
      ),
    [currentPageIds, storedSelectedIds],
  );
  const selectedCount = selectedIds.size;
  const allSelected = itemIds.length > 0 && selectedCount === itemIds.length;
  const partiallySelected = selectedCount > 0 && !allSelected;

  const setItemSelected = (id: TId, selected: boolean) => {
    if (!currentPageIds.has(id)) return;

    setStoredSelectedIds((current) => {
      const next = new Set(
        [...current].filter((selectedId) => currentPageIds.has(selectedId)),
      );
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const setCurrentPageSelected = (selected: boolean) => {
    setStoredSelectedIds(selected ? new Set(itemIds) : new Set());
  };

  const clearSelection = () => {
    setStoredSelectedIds(new Set());
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
