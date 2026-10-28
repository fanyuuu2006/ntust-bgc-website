import { withServerErrorReference } from "@/libs/observability/server-render";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminBreadcrumbs } from "@/components/(admin)/admin/AdminBreadcrumbs";
import { EventTemplateManager } from "@/components/(admin)/admin/events/EventTemplateManager";
import { eventTemplatesService } from "@/services/events/event-templates.service";

async function EventTemplatesPage() {
  const templates = await eventTemplatesService.list();
  return <>
    <HeadingSection title="活動範本" breadcrumb={<AdminBreadcrumbs items={[{ href: "/admin", label: "管理總覽" }, { href: "/admin/events", label: "活動管理" }, { label: "活動範本" }]} />} description="重用常見活動內容，快速建立新活動。" />
    <main className="container py-6"><EventTemplateManager templates={templates} /></main>
  </>;
}

export default withServerErrorReference(EventTemplatesPage, "/admin/events/templates");
