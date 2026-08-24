import { BoardGameActions } from "@/components/(admin)/admin/board-games/BoardGameActions";
import { BoardGameStatusBadge } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { BoardGameImage } from "@/components/BoardGameImage";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { BASE_PATH } from "@/app/(admin)/admin/board-games/constants";
import type { BoardGamesQuery } from "@/app/(admin)/admin/board-games/types";
import type { BoardGameWithCategoryAndLocation } from "@/services/board-games/board-games.types";
import { formatAdminDateTime } from "@/utils/date";

type Props = React.HTMLAttributes<HTMLDivElement> & { boardGames: BoardGameWithCategoryAndLocation[]; query: BoardGamesQuery };
export function BoardGameTable({ boardGames, query, className, ...props }: Props) {
  if (!boardGames.length) return <EmptyState className={className} title="目前沒有桌遊資料" description="請調整搜尋或篩選條件後再試一次。" {...props} />;
  const headerQuery = toQuery(query);
  return <div className={className} {...props}><AdminListSection className="hidden lg:block"><Table className="lg:min-w-220"><TableHeader><TableRow><SortableTableHeader label="編號" column="inventory_number" basePath={BASE_PATH} query={headerQuery} className="text-center" /><SortableTableHeader label="桌遊" column="name" basePath={BASE_PATH} query={headerQuery} /><TableHead>狀態</TableHead><TableHead>位置</TableHead><TableHead>種類</TableHead><SortableTableHeader label="更新時間" column="updated_at" basePath={BASE_PATH} query={headerQuery} /><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{boardGames.map((game) => <TableRow key={game.id}><TableCell className="text-center font-mono">{game.inventory_number}</TableCell><TableCell><div className="flex items-center gap-3"><BoardGameImage boardGame={game} className="size-10 shrink-0 rounded-md border border-(--border) object-cover" /><span className="font-medium">{game.name}</span></div></TableCell><TableCell><BoardGameStatusBadge status={game.status} /></TableCell><TableCell>{game.location.name}</TableCell><TableCell>{game.category.name}</TableCell><TableCell className="whitespace-nowrap">{formatAdminDateTime(game.updated_at)}</TableCell><TableCell className="text-right"><BoardGameActions boardGameId={game.id} boardGameName={game.name} /></TableCell></TableRow>)}</TableBody></Table></AdminListSection><div className="grid gap-3 lg:hidden">{boardGames.map((game) => <Card key={game.id} className="space-y-3 p-4"><div className="flex items-start gap-3"><BoardGameImage boardGame={game} className="size-12 shrink-0 rounded-md border border-(--border) object-cover" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{game.name}</h2><BoardGameStatusBadge status={game.status} /></div><p className="mt-1 text-sm text-(--muted)">#{game.inventory_number} · {game.category.name} · {game.location.name}</p></div></div><p className="text-xs text-(--muted)">更新：{formatAdminDateTime(game.updated_at)}</p><BoardGameActions boardGameId={game.id} boardGameName={game.name} /></Card>)}</div></div>;
}
function toQuery(query: BoardGamesQuery): Record<string, string | string[] | undefined> { return Object.fromEntries(Object.entries(query).map(([key, value]) => [key, Array.isArray(value) ? value : value === undefined ? undefined : String(value)])); }
