import { withServerErrorReference } from "@/libs/observability/server-render";
import { AdminShell } from "@/components/layouts/AdminShell";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { redirect } from "next/navigation";
import { getPublicSiteSettings } from "@/libs/site-settings/public";
import { resolveSitePresentation } from "@/libs/site-settings/presentation";

async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.email_verified_at) {
    redirect("/verify-email/pending");
  }

  const isAdmin = await isAdminByUserId(user.id);

  if (!isAdmin) {
    redirect("/");
  }

  const site = resolveSitePresentation(await getPublicSiteSettings());
  return <AdminShell user={user} site={site}>{children}</AdminShell>;
}

export default withServerErrorReference(AdminLayout, "/admin");
