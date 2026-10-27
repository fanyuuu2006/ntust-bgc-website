import { Calendar, Clock3 } from "lucide-react";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { formatPocSelectedDate, formatPocTimeRange, type PocCalendarEvent } from "./calendar-utils";
import { isCalendarColor } from "@/utils/calendar-color";

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日・${formatPocSelectedDate(date).split("・")[1]}`;
}

export function EventDetailsContent({ event, datePlaceholder = false }: { event: PocCalendarEvent; datePlaceholder?: boolean }) {
  const colorClass = isCalendarColor(event.calendarColor) ? "poc-modal-color-custom" : `poc-modal-color-${event.color ?? "blue"}`;
  return <div className="poc-event-details">
    <div className="poc-event-details-header">
      <span className={`poc-modal-color ${colorClass}`} style={isCalendarColor(event.calendarColor) ? { "--event-color": event.calendarColor } as React.CSSProperties : undefined} aria-hidden="true" />
      <h3 className="poc-event-details-title">{event.title}</h3>
      {event.publicationStatus === "draft" ? <span className="poc-event-details-status">草稿</span> : null}
      {event.cancelled ? <span className="poc-event-details-status">已取消</span> : null}
    </div>
    <dl className="poc-event-details-meta">
      <div>
        <dd className="poc-event-date-line"><Calendar aria-hidden="true" className="poc-event-meta-icon" />{datePlaceholder ? "尚未設定開始時間" : formatDateLabel(event.start.slice(0, 10))}</dd>
        <dd className="poc-event-time-line"><Clock3 aria-hidden="true" className="poc-event-meta-icon" />{formatPocTimeRange(event)}</dd>
      </div>
      {event.checkInOpensAt && event.checkInClosesAt ? <div><dt>簽到時間</dt><dd>{event.checkInOpensAt.slice(11, 16)}–{event.checkInClosesAt.slice(11, 16)}</dd></div> : null}
    </dl>
    {event.cancelled ? <p className="poc-event-details-notice">此活動已取消，請留意後續公告。</p> : null}
    <section className="poc-event-description" aria-labelledby="poc-event-description-title">
      <h4 id="poc-event-description-title">活動介紹</h4>
      {event.description ? event.descriptionFormat === "rich_text_v1" && event.richDescription ? <RichTextRenderer content={event.description} content_format="rich_text_v1" rich_content={event.richDescription} /> : <p className="poc-event-description-plain">{event.description}</p> : <p className="poc-event-description-empty">目前沒有活動介紹。</p>}
    </section>
  </div>;
}
