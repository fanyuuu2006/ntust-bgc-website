import { withServerErrorReference } from "@/libs/observability/server-render";
import { AdminShell } from "@/components/layouts/AdminShell";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { redirect } from "next/navigation";

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

  return <AdminShell user={user}>{children}</AdminShell>;
}

export default withServerErrorReference(AdminLayout, "/");
