import type { PurchaseSuggestionItem } from "@/services/purchase-suggestions/purchase-suggestions.types";
import { referenceUrlSchema } from "@/services/purchase-suggestions/purchase-suggestions.schema";
import { PURCHASE_SUGGESTION_STATUS_LABELS } from "@/utils/purchase-suggestions";
import { formatDate } from "@/utils/date";

export function PurchaseSuggestionContent({ item }: { item: PurchaseSuggestionItem }) {
  const parsedUrl = referenceUrlSchema.safeParse(item.reference_url ?? "");
  const url = parsedUrl.success ? parsedUrl.data : null;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="min-w-0 break-words font-semibold">{item.game_name}</h2><span className="text-sm text-(--text-muted)">{PURCHASE_SUGGESTION_STATUS_LABELS[item.status]}</span></div>
    <p className="mt-2 text-xs text-(--text-muted)">提交於 {formatDate(item.created_at)}</p>
    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{item.reason}</p>
    {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block max-w-full break-all text-sm text-(--action) underline">參考連結：{new URL(url).hostname}（外部網站）</a> : null}
  </>;
}
