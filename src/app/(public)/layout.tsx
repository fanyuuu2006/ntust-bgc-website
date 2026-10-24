import { withServerErrorReference } from "@/libs/observability/server-render";
import { WebsiteShell } from "@/components/layouts/WebsiteShell";
import { resolvePublicViewer } from "@/libs/public-viewer";
import { getPublicSiteSettings } from "@/libs/site-settings/public";

async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [viewer, siteSettings] = await Promise.all([resolvePublicViewer(), getPublicSiteSettings()]);
  const user = viewer.status === "resolved" ? viewer.user : null;
  const isAdmin = viewer.status === "resolved" ? viewer.isAdmin : false;
  return (
    <WebsiteShell user={user} isAdmin={isAdmin} siteSettings={siteSettings}>
      {children}
    </WebsiteShell>
  );
}

export default withServerErrorReference(PublicLayout, "/");
