import { withServerErrorReference } from "@/libs/observability/server-render";
import { WebsiteShell } from "@/components/layouts/WebsiteShell";
import { getCurrentUser } from "@/libs/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublicSiteSettings } from "@/libs/site-settings/public";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, siteSettings] = await Promise.all([getCurrentUser(), getPublicSiteSettings()]);

  if (user && !user.email_verified_at) {
    redirect("/verify-email/pending");
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <WebsiteShell user={user} isAdmin={false} footerVariant="legal" siteSettings={siteSettings}>
      {children}
    </WebsiteShell>
  );
}

export default withServerErrorReference(AuthLayout, "/");
