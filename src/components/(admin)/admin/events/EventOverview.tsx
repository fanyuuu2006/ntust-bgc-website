import { RichTextRenderer } from "@/components/RichTextRenderer";
import { storedDescription } from "@/libs/rich-content/description";
import type { Event } from "@/types/database";
import { formatDateTime } from "@/utils/date";

export function EventOverview({ event }: { event: Event }) {
  const hasDescription = Boolean(event.description || event.rich_description);

  return (
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(260px,3fr)]">
      <section className="min-w-0 space-y-4" aria-labelledby="event-description-title">
        <div className="min-w-0">
          <h2 id="event-description-title" className="text-sm font-semibold text-(--text-primary)">
            活動描述
          </h2>
          <div className="mt-2 min-w-0 overflow-x-auto text-sm text-(--text-secondary)">
            {hasDescription ? (
              <RichTextRenderer {...storedDescription(event)} />
            ) : (
              <p className="text-(--text-muted)">尚無活動描述</p>
            )}
          </div>
        </div>
      </section>

      <section className="min-w-0 self-start rounded-xl border border-(--border-default) bg-(--secondary-background) p-4" aria-labelledby="event-metadata-title">
        <h2 id="event-metadata-title" className="text-sm font-semibold text-(--text-primary)">
          活動資訊
        </h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div className="min-w-0">
            <dt className="text-(--text-muted)">自助簽到開放</dt>
            <dd className="mt-1 wrap-break-word text-(--text-primary)">
              {event.check_in_opens_at ? formatDateTime(event.check_in_opens_at) : "未設定"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-(--text-muted)">自助簽到截止</dt>
            <dd className="mt-1 wrap-break-word text-(--text-primary)">
              {event.check_in_closes_at ? formatDateTime(event.check_in_closes_at) : "未設定"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
