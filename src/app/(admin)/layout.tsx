import { AdminShell } from "@/components/layouts/AdminShell";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await isAdminByUserId(user.id);

  if (!isAdmin) {
    redirect("/");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
