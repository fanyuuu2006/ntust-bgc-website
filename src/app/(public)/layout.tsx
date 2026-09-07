import { WebsiteShell } from "@/components/layouts/WebsiteShell";
import { resolvePublicViewer } from "@/libs/public-viewer";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await resolvePublicViewer();
  const user = viewer.status === "resolved" ? viewer.user : null;
  const isAdmin = viewer.status === "resolved" ? viewer.isAdmin : false;
  return (
    <WebsiteShell user={user} isAdmin={isAdmin}>
      {children}
    </WebsiteShell>
  );
}
