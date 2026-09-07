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

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
  const isAdmin = await isAdminByUserId(user.id);

  return (
    <WebsiteShell user={user} isAdmin={isAdmin}>
      {children}
    </WebsiteShell>
  );
}
