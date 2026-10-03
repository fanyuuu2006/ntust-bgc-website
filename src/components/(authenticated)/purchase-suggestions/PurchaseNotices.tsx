import Link from "next/link";
import { purchaseSuggestionsService } from "@/services/purchase-suggestions/purchase-suggestions.service";
import { reportUnexpectedError } from "@/libs/observability/report";
import { PurchaseNoticeAction } from "./PurchaseNoticeAction";

export async function PurchaseNotices() {
  let notices;
  try { notices = await purchaseSuggestionsService.notices(); }
  catch (error) {
    reportUnexpectedError(error, { context: "purchase-suggestions.notices" });
    return <p className="text-sm text-(--text-muted)">購入提醒暫時無法載入，請稍後至「我的推薦」查看。</p>;
  }
  if (!notices.total) return null;
  return <section aria-labelledby="purchase-notices-title" className="rounded-2xl border border-(--border-default) bg-(--surface-default) p-4">
    <h2 id="purchase-notices-title" className="font-semibold">你推薦的桌遊已購入</h2>
    <ul className="mt-3 space-y-3">{notices.data.map((notice) => <li key={notice.id} className="flex flex-wrap items-center justify-between gap-3"><span className="min-w-0 break-words">{notice.game_name}</span><PurchaseNoticeAction id={notice.id} noticeVersion={notice.purchase_notice_version} /></li>)}</ul>
    <Link href="/purchase-suggestions/mine" className="mt-3 inline-block text-sm text-(--action) underline">查看我的推薦（{notices.total} 則未讀提醒）</Link>
  </section>;
}
