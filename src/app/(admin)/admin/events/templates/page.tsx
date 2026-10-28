import { withServerErrorReference } from "@/libs/observability/server-render";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminBreadcrumbs } from "@/components/(admin)/admin/AdminBreadcrumbs";
import { EventTemplateManager } from "@/components/(admin)/admin/events/EventTemplateManager";
import { eventTemplatesService } from "@/services/events/event-templates.service";
import { ButtonLink } from "@/components/ui/Button";

async function EventTemplatesPage({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const [templates, params] = await Promise.all([eventTemplatesService.list(), searchParams]);
  return <>
    <HeadingSection title="活動範本" breadcrumb={<AdminBreadcrumbs items={[{ href: "/admin", label: "管理總覽" }, { href: "/admin/events", label: "活動管理" }, { label: "活動範本" }]} />} description="重用常見活動內容，快速建立新活動。" actions={<ButtonLink href="/admin/events/templates?create=1">新增範本</ButtonLink>} />
    <main className="container py-6"><EventTemplateManager templates={templates} initialCreate={params.create === "1"} /></main>
  </>;
}

export default withServerErrorReference(EventTemplatesPage, "/admin/events/templates");
