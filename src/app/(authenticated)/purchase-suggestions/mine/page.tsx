import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { PurchaseNotices } from "@/components/(authenticated)/purchase-suggestions/PurchaseNotices";
import { PurchaseSuggestionContent } from "@/components/(authenticated)/purchase-suggestions/PurchaseSuggestionContent";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";
import { withServerErrorReference } from "@/libs/observability/server-render";

async function MyPurchaseSuggestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const result = await purchaseSuggestionsService.listOwn(await searchParams);
  return <section className="container max-w-3xl space-y-5 py-8">
    <PageHeader title="我的推薦" description="只有你與具管理權限的幹部可以查看這些紀錄。被移除的紀錄不會顯示，仍計入額度。" />
    <Link href="/purchase-suggestions" className="inline-block text-(--action) underline">推薦另一款桌遊</Link>
    <PurchaseNotices />
    <PaginatedCollection {...result} basePath="/purchase-suggestions/mine" query={{}} pageSizeOptions={[20, 50]} itemLabel="筆推薦">
      <div className="space-y-4">{result.data.length ? result.data.map((item) => <article key={item.id} className="rounded-2xl border border-(--border-default) bg-(--surface-default) p-4"><PurchaseSuggestionContent item={item} /></article>) : <p className="py-6 text-(--text-muted)">目前沒有可顯示的推薦。</p>}</div>
    </PaginatedCollection>
  </section>;
}
export default withServerErrorReference(MyPurchaseSuggestionsPage, "/purchase-suggestions/mine");
