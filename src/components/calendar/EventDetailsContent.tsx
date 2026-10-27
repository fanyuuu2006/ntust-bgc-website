import { Calendar, Clock3 } from "lucide-react";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { formatPocSelectedDate, formatPocTimeRange, type PocCalendarEvent } from "./calendar-utils";
import { isCalendarColor } from "@/utils/calendar-color";

function formatDateLabel(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日・${formatPocSelectedDate(date).split("・")[1]}`;
}

export function EventDetailsContent({ event, datePlaceholder = false }: { event: PocCalendarEvent; datePlaceholder?: boolean }) {
  const colorClass = isCalendarColor(event.calendarColor) ? "event-calendar-modal-color-custom" : `event-calendar-modal-color-${event.color ?? "blue"}`;
  return <div className="event-calendar-event-details">
    <div className="event-calendar-event-details-header">
      <span className={`event-calendar-modal-color ${colorClass}`} style={isCalendarColor(event.calendarColor) ? { "--event-color": event.calendarColor } as React.CSSProperties : undefined} aria-hidden="true" />
      <h3 className="event-calendar-event-details-title">{event.title}</h3>
      {event.publicationStatus === "draft" ? <span className="event-calendar-event-details-status">草稿</span> : null}
      {event.cancelled ? <span className="event-calendar-event-details-status">已取消</span> : null}
    </div>
    <dl className="event-calendar-event-details-meta">
      <div>
        <dd className="event-calendar-event-date-line"><Calendar aria-hidden="true" className="event-calendar-event-meta-icon" />{datePlaceholder ? "尚未設定開始時間" : formatDateLabel(event.start.slice(0, 10))}</dd>
        <dd className="event-calendar-event-time-line"><Clock3 aria-hidden="true" className="event-calendar-event-meta-icon" />{formatPocTimeRange(event)}</dd>
      </div>
      {event.checkInOpensAt && event.checkInClosesAt ? <div><dt>簽到時間</dt><dd>{event.checkInOpensAt.slice(11, 16)}–{event.checkInClosesAt.slice(11, 16)}</dd></div> : null}
    </dl>
    {event.cancelled ? <p className="event-calendar-event-details-notice">此活動已取消，請留意後續公告。</p> : null}
    <section className="event-calendar-event-description" aria-labelledby="event-calendar-event-description-title">
      <h4 id="event-calendar-event-description-title">活動介紹</h4>
      {event.description ? event.descriptionFormat === "rich_text_v1" && event.richDescription ? <RichTextRenderer content={event.description} content_format="rich_text_v1" rich_content={event.richDescription} /> : <p className="event-calendar-event-description-plain">{event.description}</p> : <p className="event-calendar-event-description-empty">目前沒有活動介紹。</p>}
    </section>
  </div>;
}
