import type { ReactNode } from "react";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminBreadcrumbs, type AdminBreadcrumbItem } from "@/components/(admin)/admin/AdminBreadcrumbs";
import { EventDetailNavigation } from "@/components/(admin)/admin/events/EventDetailNavigation";
import { EventStatusBadge } from "@/components/(admin)/admin/events/EventStatusBadge";
import type { Event } from "@/types/database";
import { formatDateTime } from "@/utils/date";

export function EventDetailHeader({ event, returnTo, active, actions, breadcrumbTail }: { event: Event; returnTo: string; active: "overview" | "attendances"; actions?: ReactNode; breadcrumbTail?: AdminBreadcrumbItem }) {
  const items: AdminBreadcrumbItem[] = [{ href: "/admin", label: "管理總覽" }, { href: returnTo, label: "活動管理" }, { label: event.name }];
  if (breadcrumbTail) items.push(breadcrumbTail);
  return <>
    <HeadingSection breadcrumb={<AdminBreadcrumbs items={items} />} title={event.name} description={`${formatDateTime(event.start_time)}–${formatDateTime(event.end_time)}`} actions={actions} />
    <div className="px-4 sm:px-6 lg:px-8"><EventStatusBadge event={event} /></div>
    <div className="px-4 pt-3 pb-4 sm:px-6 lg:px-8"><EventDetailNavigation eventId={event.id} active={active} returnTo={returnTo} /></div>
  </>;
}
