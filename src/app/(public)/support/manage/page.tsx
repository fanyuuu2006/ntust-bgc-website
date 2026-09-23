import { notFound, redirect } from "next/navigation";

import { SupportManagePanel } from "@/components/(public)/support/SupportManagePanel";
import { getCurrentUser } from "@/libs/auth";
import { isSupportManager } from "@/libs/support-manager";
import { supportService } from "@/services/support/support.service";

export default async function SupportManagePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isSupportManager(user)) notFound();
  const records = await supportService.listPrivate();

  return (
    <div className="container min-w-0 max-w-4xl space-y-6 py-8 sm:py-10">
      <SupportManagePanel initialRecords={records} />
    </div>
  );
}
