"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/libs/api/client";

export type AdminBoardGameFilterValue = {
  id: string;
  name: string;
  inventoryNumber: number;
};

export function AdminBoardGameFilter({
  selected,
  basePath,
  query,
}: {
  selected: AdminBoardGameFilterValue | null;
  basePath: string;
  query: Record<string, string | number | undefined>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminBoardGameFilterValue[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function navigate(boardGameId?: string) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "" && key !== "page" && key !== "boardGameId") {
        params.set(key, String(value));
      }
    }
    if (boardGameId) params.set("boardGameId", boardGameId);
    router.push(params.size ? `${basePath}?${params}` : basePath);
  }

  async function findBoardGames() {
    const keyword = search.trim();
    if (!keyword || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiClient<{ data: AdminBoardGameFilterValue[] }>(
        `/api/admin/board-games/search?search=${encodeURIComponent(keyword)}`,
      );
      setResults(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "搜尋桌遊失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-xs font-medium text-(--text-muted)">桌遊篩選</p>
      {selected ? (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-(--border-default) bg-(--surface-subtle) px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-sm" title={selected.name}>
            {selected.name} <span className="text-(--text-muted)">#{selected.inventoryNumber}</span>
          </p>
          <Button type="button" size="sm" variant="text" onClick={() => navigate()}>
            清除
          </Button>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 gap-2">
            <Input
              value={search}
              placeholder="搜尋桌遊名稱或館藏編號"
              className="min-w-0 flex-1"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void findBoardGames();
                }
              }}
            />
            <Button type="button" variant="outline" isLoading={busy} onClick={() => void findBoardGames()}>
              搜尋
            </Button>
          </div>
          {error ? <p role="alert" className="text-sm text-(--status-danger)">{error}</p> : null}
          {results.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-(--border-default) bg-(--surface-elevated)">
              {results.map((game) => (
                <li key={game.id} className="border-b border-(--border-default) last:border-b-0">
                  <button
                    type="button"
                    className="flex min-h-11 w-full min-w-0 items-center gap-2 px-3 py-2 text-left hover:bg-(--surface-subtle)"
                    onClick={() => navigate(game.id)}
                  >
                    <span className="min-w-0 flex-1 truncate" title={game.name}>{game.name}</span>
                    <span className="shrink-0 text-xs text-(--text-muted)">#{game.inventoryNumber}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
