import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PurchaseSuggestionContent } from "@/components/(authenticated)/purchase-suggestions/PurchaseSuggestionContent";
import { PurchaseSuggestionActions } from "@/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionActions";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";
import { purchaseSuggestionQuerySchema } from "@/services/purchase-suggestions/purchase-suggestions.schema";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { formatDate } from "@/utils/date";

async function AdminPurchaseSuggestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = purchaseSuggestionQuerySchema.parse(await searchParams);
  const result = await purchaseSuggestionsService.listAdmin(query);
  return <section className="space-y-5">
    <PageHeader title="桌遊購入建議" description="待評估優先顯示較早的推薦。確認同款遊戲後，請逐筆標記已購入以通知各推薦者。" />
    <form className="flex flex-wrap items-end gap-3" action="/admin/purchase-suggestions" method="get">
      <label className="min-w-0 flex-1 space-y-1"><span className="text-sm">桌遊名稱</span><Input name="search" defaultValue={query.search} maxLength={120} /></label>
      <label className="space-y-1"><span className="text-sm">處理狀態</span><Select name="status" defaultValue={query.status}><option value="pending">待評估</option><option value="purchased">已購入</option><option value="rejected">不採納</option><option value="all">全部</option></Select></label>
      <input type="hidden" name="pageSize" value={query.pageSize} /><Button type="submit">套用</Button>
    </form>
    <PaginatedCollection {...result} basePath="/admin/purchase-suggestions" query={{ status: query.status, search: query.search }} pageSizeOptions={[20, 50]} itemLabel="筆推薦">
      <div className="space-y-4">{result.data.length ? result.data.map((item) => <article key={item.id} className="rounded-2xl border border-(--border-default) bg-(--surface-default) p-4 sm:p-5">
        <PurchaseSuggestionContent item={item} />
        {item.reviewed_at ? <p className="mt-3 text-xs text-(--text-muted)">最後處理於 {formatDate(item.reviewed_at)} {item.reviewed_by_user_id ? <Link href={`/admin/users/${item.reviewed_by_user_id}`} className="underline">查看處理者</Link> : null}</p> : null}
        <PurchaseSuggestionActions id={item.id} version={item.version} status={item.status} />
      </article>) : <p className="py-6 text-(--text-muted)">目前沒有符合條件的推薦。</p>}</div>
    </PaginatedCollection>
  </section>;
}
export default withServerErrorReference(AdminPurchaseSuggestionsPage, "/admin/purchase-suggestions");
