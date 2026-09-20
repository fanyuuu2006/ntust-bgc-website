"use client";

import { SearchableEntityPicker } from "@/components/(admin)/admin/SearchableEntityPicker";
import { apiClient } from "@/libs/api/client";

export type AdminBoardGameFilterValue = {
  id: string;
  name: string;
  inventoryNumber: number;
};

export function AdminBoardGameFilter({ selected, name = "boardGameId", id }: {
  selected: AdminBoardGameFilterValue | null;
  name?: string;
  id?: string;
}) {
  return (
    <SearchableEntityPicker
      id={id}
      name={name}
      initialValue={selected}
      search={async (query) => {
        const response = await apiClient<{ data: AdminBoardGameFilterValue[] }>(
          `/api/admin/board-games/search?search=${encodeURIComponent(query)}`,
        );
        return response.data;
      }}
      getKey={(game) => game.id}
      searchLabel="搜尋桌遊名稱或社產編號"
      searchPlaceholder="搜尋桌遊名稱或社產編號"
      resultsLabel="桌遊搜尋結果"
      emptyMessage="找不到符合條件的桌遊"
      errorMessage="搜尋桌遊失敗，請稍後再試"
      clearSelectionLabel={(game) => `清除桌遊篩選：${game.name}`}
      renderResult={(game) => <BoardGameIdentity game={game} />}
      renderSelected={(game) => <BoardGameIdentity game={game} />}
    />
  );
}

function BoardGameIdentity({ game }: { game: AdminBoardGameFilterValue }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium" title={game.name}>{game.name}</span>
      <span className="shrink-0 text-xs text-(--text-muted)">#{game.inventoryNumber}</span>
    </span>
  );
}
