import Link from "next/link";
import { notFound } from "next/navigation";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminBreadcrumbs } from "@/components/(admin)/admin/AdminBreadcrumbs";
import { EventEditForm } from "@/components/(admin)/admin/events/EventEditForm";
import { EventPreviewTrigger } from "@/components/(admin)/admin/events/EventPreviewTrigger";
import { Button } from "@/components/ui/Button";
import { eventsService } from "@/services/events/events.service";
import { getAdminReturnPath } from "@/utils/admin-return";
import { type QueryParamValue } from "@/libs/query-params";

async function EventEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: QueryParamValue }> }) {
  const [{ id }, rawQuery] = await Promise.all([params, searchParams]);
  const returnTo = getAdminReturnPath(rawQuery.returnTo, "/admin/events");
  const event = await eventsService.getEventById(id);
  if (!event) notFound();
  return <>
    <HeadingSection breadcrumb={<AdminBreadcrumbs items={[{ href: "/admin", label: "管理總覽" }, { href: returnTo, label: "活動管理" }, { href: `/admin/events/${event.id}`, label: event.name }, { label: "編輯活動" }]} />} title="編輯活動" actions={<div className="flex flex-wrap items-center gap-2"><EventPreviewTrigger /><Link href={`/admin/events/${event.id}?returnTo=${encodeURIComponent(returnTo)}`}><Button type="button" variant="outline" size="sm">返回活動總覽</Button></Link></div>} />
    <section className="min-w-0 px-4 pb-6 sm:px-6 lg:px-8"><EventEditForm event={event} /></section>
  </>;
}

export default withServerErrorReference(EventEditPage, "/admin/events/[id]/edit");
