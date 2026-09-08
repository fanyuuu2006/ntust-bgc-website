import { WebsiteShell } from "@/components/layouts/WebsiteShell";
import { getCurrentUser } from "@/libs/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user && !user.email_verified_at) {
    redirect("/verify-email/pending");
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <WebsiteShell user={user} isAdmin={false} footerVariant="legal">
      {children}
    </WebsiteShell>
  );
}
