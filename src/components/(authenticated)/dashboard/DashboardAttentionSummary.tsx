import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  KeyRound,
  TriangleAlert,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { SelfCheckInEvent } from "@/services/events/events.types";
import type { MembershipWithAcademicYear } from "@/services/memberships/memberships.types";

type AttentionItem = {
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "info";
};

export function DashboardAttentionSummary({
  membership,
  selfCheckInEvents,
}: {
  membership: MembershipWithAcademicYear | null;
  selfCheckInEvents: SelfCheckInEvent[];
}) {
  const items: AttentionItem[] = [];
  if (!membership)
    items.push({
      title: "尚未完成會員資格",
      detail: "啟用資格後即可參加社員活動。",
      href: "/memberships",
      tone: "warning",
    });
  const checkIn = selfCheckInEvents.find(
    ({ event, attendance }) => !event.cancelled_at && !attendance,
  );
  if (checkIn)
    items.push({
      title: `尚未簽到：${checkIn.event.name}`,
      detail: "目前仍在簽到時間內。",
      href: "/dashboard",
      tone: "info",
    });

  return (
    <Card surface={items.length ? "default" : "subtle"} className="p-4">
      <section aria-labelledby="dashboard-attention-title">
        <div className="flex items-start gap-3">
          <BellRing
            aria-hidden="true"
            className={
              items.length
                ? "mt-0.5 size-5 text-(--status-warning)"
                : "mt-0.5 size-5 text-(--status-success)"
            }
          />
          <div>
            <h2
              id="dashboard-attention-title"
              className="font-semibold text-(--text-primary)"
            >
              需要我處理
            </h2>
            <p className="mt-0.5 text-xs text-(--text-muted)">
              {items.length
                ? `${items.length} 件待處理事項`
                : "目前沒有需要立即處理的事項"}
            </p>
          </div>
        </div>
        {items.length ? (
          <ul className="mt-3 space-y-2">
            {items.slice(0, 3).map((item) => (
              <li
                key={item.title}
                className="flex min-w-0 items-start gap-3 rounded-xl bg-(--surface-subtle) p-3"
              >
                <AttentionIcon tone={item.tone} />
                <div className="min-w-0 flex-1">
                  <p className="wrap-break-word font-medium text-(--text-primary)">
                    {item.title}
                  </p>
                  <p className="mt-0.5 wrap-break-word text-xs text-(--text-muted)">
                    {item.detail}
                  </p>
                </div>
                <ButtonLink
                  href={item.href}
                  variant="text"
                  size="sm"
                  className="shrink-0 px-0"
                  aria-label={`處理：${item.title}`}
                >
                  <ArrowRight aria-hidden="true" className="size-4" />
                </ButtonLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-(--text-secondary)">
            <CalendarCheck2
              aria-hidden="true"
              className="size-4 text-(--status-success)"
            />
            一切都在掌握中，繼續探索社團活動吧。
          </p>
        )}
      </section>
    </Card>
  );
}

function AttentionIcon({ tone }: { tone: AttentionItem["tone"] }) {
  if (tone === "danger")
    return (
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-(--status-danger)"
      />
    );
  if (tone === "warning")
    return (
      <KeyRound
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-(--status-warning)"
      />
    );
  return (
    <CalendarCheck2
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 text-(--status-info)"
    />
  );
}
