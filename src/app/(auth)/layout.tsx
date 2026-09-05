import { WebsiteShell } from "@/components/layouts/WebsiteShell";
import { getCurrentUser } from "@/libs/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <WebsiteShell user={user} isAdmin={false} footerVariant="legal">
      {children}
    </WebsiteShell>
  );
}
