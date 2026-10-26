import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHeader } from "@/components/PageHeader";
import { PublicEventCalendar } from "@/components/(public)/PublicEventCalendar";
import { createPublicMetadata } from "@/libs/seo";

export const metadata: Metadata = createPublicMetadata({ title: "行事曆", description: "查看社團活動與近期行程。", canonical: "/schedule" });

export default function SchedulePage() {
  return <section><div className="container py-8"><PageHeader breadcrumb={<Breadcrumbs items={[{ href: "/", label: "首頁" }, { label: "行事曆" }]} />} title="行事曆" description="查看社團活動與近期行程。" /><div className="mt-6 min-w-0"><PublicEventCalendar /></div></div></section>;
}
