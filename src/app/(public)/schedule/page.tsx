import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/PageHeader";
import { PublicEventCalendar } from "@/components/(public)/PublicEventCalendar";
import { createPublicMetadata } from "@/libs/seo";
import { getTaiwanHolidays } from "@/components/calendar/calendar-holidays";

export const metadata: Metadata = createPublicMetadata({
  title: "行事曆",
  description: "查看社團活動與近期行程。",
  canonical: "/schedule",
});

export default function SchedulePage() {
  const holidays = [...getTaiwanHolidays(2026), ...getTaiwanHolidays(2027)];
  return (
    <section>
      <div className="container py-8">
        <PageHeader
          breadcrumb={
            <Breadcrumbs
              items={[{ href: "/", label: "首頁" }, { label: "行事曆" }]}
            />
          }
          title="行事曆"
          description="查看社團活動與近期行程。"
        />
        <div className="mt-6 min-w-0">
          <PublicEventCalendar holidays={holidays} />
        </div>
      </div>
    </section>
  );
}
