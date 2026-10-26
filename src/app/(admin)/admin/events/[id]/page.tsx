import Link from "next/link";
import { notFound } from "next/navigation";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { EventDetailHeader } from "@/components/(admin)/admin/events/EventDetailHeader";
import { EventOverview } from "@/components/(admin)/admin/events/EventOverview";
import { Button } from "@/components/ui/Button";
import { eventsService } from "@/services/events/events.service";
import { getAdminReturnPath } from "@/utils/admin-return";
import { type QueryParamValue } from "@/libs/query-params";

async function AdminEventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: QueryParamValue }> }) {
  const [{ id }, rawQuery] = await Promise.all([params, searchParams]);
  const returnTo = getAdminReturnPath(rawQuery.returnTo, "/admin/events");
  const event = await eventsService.getEventById(id);
  if (!event) notFound();
  return <>
    <EventDetailHeader event={event} returnTo={returnTo} active="overview" actions={<Link href={`/admin/events/${event.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}><Button type="button" variant="primary">編輯活動</Button></Link>} />
    <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8"><EventOverview event={event} /></section>
  </>;
}

export default withServerErrorReference(AdminEventDetailPage, "/admin/events/[id]");
