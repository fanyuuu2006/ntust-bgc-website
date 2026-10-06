import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { PurchaseSuggestionList } from "@/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionList";
import { PaginatedCollection } from "@/components/Pagination/PaginatedCollection";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { ImmediateQuerySelect } from "@/components/query/ImmediateQuerySelect";
import { Button } from "@/components/ui/Button";
import { buildOwnedQueryHref } from "@/libs/query-navigation";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";
import { purchaseSuggestionQuerySchema } from "@/services/purchase-suggestions/purchase-suggestions.schema";
import { withServerErrorReference } from "@/libs/observability/server-render";
const BASE_PATH = "/admin/board-games/suggests";
async function AdminPurchaseSuggestionsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = purchaseSuggestionQuerySchema.parse(await searchParams);
  const result = await purchaseSuggestionsService.listAdmin(query);
  const clearSearchHref = buildOwnedQueryHref({ basePath: BASE_PATH, appliedQuery: query, ownedKeys: ["search"], changes: { search: undefined } });
  return <>
    <HeadingSection title="桌遊購入建議" description="管理桌遊購入推薦，並更新處理狀態。" />
    <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
      <PaginatedCollection
        {...result}
        basePath={BASE_PATH}
        query={{ status: query.status, search: query.search }}
        pageSizeOptions={[20, 50]}
        itemLabel="筆推薦"
        paginationClassName="p-4"
      >
        <div className="space-y-4">
          <AdminToolbar aria-label="桌遊購入建議搜尋與篩選">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <form
                className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                action={BASE_PATH}
                method="get"
                aria-label="搜尋桌遊推薦"
              >
                <ClearableSearchInput
                  name="search"
                  initialValue={query.search}
                  clearHref={clearSearchHref}
                  placeholder="搜尋桌遊名稱"
                  aria-label="桌遊名稱"
                />
                <input
                  type="hidden"
                  name="status"
                  value={query.status}
                />
                <input
                  type="hidden"
                  name="pageSize"
                  value={query.pageSize}
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto"
                >搜尋</Button>
              </form>
              <ImmediateQuerySelect
                basePath={BASE_PATH}
                appliedQuery={query}
                queryKey="status"
                value={query.status}
                aria-label="處理狀態"
              >
                <option value="pending">待評估</option><option value="purchased">已購入</option><option value="rejected">不採納</option><option value="all">全部狀態</option>
              </ImmediateQuerySelect>
            </div>
          </AdminToolbar>
          <PurchaseSuggestionList items={result.data} hasQuery={Boolean(query.search || query.status !== "all" || query.page > 1)} />
        </div>
      </PaginatedCollection>
    </section>
  </>;
}
export default withServerErrorReference(AdminPurchaseSuggestionsPage, BASE_PATH);
