import { WebsiteShell } from "@/components/layouts/WebsiteShell";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const isAdmin = user ? await isAdminByUserId(user.id) : false;
  return (
    <WebsiteShell user={user} isAdmin={isAdmin}>
      {children}
    </WebsiteShell>
  );
}
