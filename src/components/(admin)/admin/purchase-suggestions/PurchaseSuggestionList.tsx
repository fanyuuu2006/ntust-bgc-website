import Link from "next/link";
import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { PurchaseSuggestionActions } from "./PurchaseSuggestionActions";
import { referenceUrlSchema } from "@/services/purchase-suggestions/purchase-suggestions.schema";
import type { AdminPurchaseSuggestionItem } from "@/services/purchase-suggestions/purchase-suggestions.types";
import { PURCHASE_SUGGESTION_STATUS_LABELS } from "@/utils/purchase-suggestions";
import { formatAdminDateTime } from "@/utils/date";
function Status({ item }: {
  item: AdminPurchaseSuggestionItem;
}) {
  return <Badge tone={item.status === "purchased" ? "success" : item.status === "pending" ? "warning" : "neutral"}>{PURCHASE_SUGGESTION_STATUS_LABELS[item.status]}</Badge>;
}
function Content({ item }: {
  item: AdminPurchaseSuggestionItem;
}) {
  const parsed = referenceUrlSchema.safeParse(item.reference_url ?? "");
  const url = parsed.success ? parsed.data : null;
  return <div className="min-w-0 max-w-full space-y-1 wrap-anywhere">
    <p className="min-w-0 font-semibold text-(--text-primary)">{item.game_name}</p>
    <p className="min-w-0 whitespace-pre-wrap text-xs leading-5 text-(--text-muted)">{item.reason}</p>
    {url ? <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block max-w-full break-all text-sm text-(--action) underline underline-offset-4"
    >參考連結：{new URL(url).hostname}（外部網站）</a> : null}
  </div>;
}
function Time({ item }: {
  item: AdminPurchaseSuggestionItem;
}) {
  return <div className="space-y-1 text-sm">
    <p className="text-xs text-(--text-muted)">提交時間</p>
    <p>{formatAdminDateTime(item.created_at)}</p>
    {item.reviewed_at ? <p className="text-xs text-(--text-muted)">處理：{formatAdminDateTime(item.reviewed_at)}</p> : null}
    {item.reviewed_by_user_id ? <Link href={`/admin/users/${item.reviewed_by_user_id}`} className="text-xs text-(--action) underline">查看處理者</Link> : null}
  </div>;
}
export function PurchaseSuggestionList({ items, hasQuery = false }: {
  items: AdminPurchaseSuggestionItem[];
  hasQuery?: boolean;
}) {
  if (!items.length)
    return hasQuery
      ? <QueryEmptyState
        title="沒有符合條件的推薦"
        description="調整搜尋或篩選條件後再試試看。"
        clearHref="/admin/board-games/suggests?status=all"
      />
      : <EmptyState title="目前沒有桌遊推薦" />;
  return <>
    <AdminListSection className="hidden lg:block">
      <Table className="min-w-190">
        <TableHeader><TableRow>
          <TableHead>桌遊與推薦理由</TableHead><TableHead>狀態</TableHead><TableHead>時間</TableHead><TableHead className="text-right">操作</TableHead>
        </TableRow></TableHeader>
        <TableBody>{items.map((item) => <TableRow key={item.id}>
          <TableCell className="min-w-64 max-w-lg"><Content item={item} /></TableCell>
          <TableCell className="whitespace-nowrap"><Status item={item} /></TableCell>
          <TableCell className="min-w-44"><Time item={item} /></TableCell>
          <TableCell className="min-w-56 text-right"><PurchaseSuggestionActions
            id={item.id}
            version={item.version}
            status={item.status}
          /></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </AdminListSection>
    <div className="grid min-w-0 max-w-full gap-3 lg:hidden">{items.map((item) => <Card key={item.id} className="w-full min-w-0 max-w-full space-y-3 p-4">
      <Status item={item} /><Content item={item} /><Time item={item} />
      <PurchaseSuggestionActions
        id={item.id}
        version={item.version}
        status={item.status}
      />
    </Card>)}</div>
  </>;
}
