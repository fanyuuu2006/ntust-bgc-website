import { withServerErrorReference } from "@/libs/observability/server-render";
import { WebsiteShell } from "@/components/layouts/WebsiteShell";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublicSiteSettings } from "@/libs/site-settings/public";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, siteSettings] = await Promise.all([getCurrentUser(), getPublicSiteSettings()]);

  if (!user) {
    redirect("/login");
  }
  if (!user.email_verified_at) {
    redirect("/verify-email/pending");
  }
  const isAdmin = await isAdminByUserId(user.id);

  return (
    <WebsiteShell user={user} isAdmin={isAdmin} siteSettings={siteSettings}>
      {children}
    </WebsiteShell>
  );
}

export default withServerErrorReference(AuthenticatedLayout, "/");
