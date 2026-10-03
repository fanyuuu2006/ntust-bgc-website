import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PurchaseSuggestionForm } from "@/components/(authenticated)/purchase-suggestions/PurchaseSuggestionForm";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";
import { withServerErrorReference } from "@/libs/observability/server-render";

async function PurchaseSuggestionsPage() {
  const quota = await purchaseSuggestionsService.quota();
  return <section className="container max-w-3xl space-y-5 py-8">
    <PageHeader title="桌遊購入建議" description="把你希望社團購入的桌遊推薦給幹部，不限社員資格。" />
    <Link href="/purchase-suggestions/mine" className="inline-block text-(--action) underline">我的推薦與購入提醒</Link>
    <div className="rounded-2xl border border-(--border-default) bg-(--surface-default) p-4 sm:p-6"><PurchaseSuggestionForm remaining={quota.remaining} /></div>
  </section>;
}
export default withServerErrorReference(PurchaseSuggestionsPage, "/purchase-suggestions");
