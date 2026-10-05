import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/PageHeader";
import { PurchaseSuggestionForm } from "@/components/(authenticated)/purchase-suggestions/PurchaseSuggestionForm";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";
import { withServerErrorReference } from "@/libs/observability/server-render";
async function PurchaseSuggestionsPage() {
  const quota = await purchaseSuggestionsService.quota();
  return <section className="container max-w-3xl space-y-5 py-8">
    <PageHeader title="桌遊購入建議" description="把你希望社團購入的桌遊推薦給幹部，不限社員資格。" />
    <Card className="p-4 sm:p-6"><PurchaseSuggestionForm remaining={quota.remaining} /></Card>
  </section>;
}
export default withServerErrorReference(PurchaseSuggestionsPage, "/board-games/suggest");
