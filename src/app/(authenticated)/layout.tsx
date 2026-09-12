import { withServerErrorReference } from "@/libs/observability/server-render";
import { WebsiteShell } from "@/components/layouts/WebsiteShell";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  if (!user.email_verified_at) {
    redirect("/verify-email/pending");
  }
  const isAdmin = await isAdminByUserId(user.id);

  return (
    <WebsiteShell user={user} isAdmin={isAdmin}>
      {children}
    </WebsiteShell>
  );
}

export default withServerErrorReference(AuthenticatedLayout, "/");
