import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
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
      <PageHeader title="支持紀錄管理" description="僅供網站開發者核對已完成的支持及公開同意；本站不處理付款或退款。" />
      <SupportManagePanel initialRecords={records} />
    </div>
  );
}
