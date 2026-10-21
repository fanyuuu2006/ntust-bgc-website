import type { Metadata } from "next";
import { UserRoundCog } from "lucide-react";
import { AccountClosureSection } from "@/components/(authenticated)/settings/AccountClosureSection";
import { AccountEmailSection } from "@/components/(authenticated)/settings/AccountEmailSection";
import { SettingsCard } from "@/components/(authenticated)/settings/SettingsCard";
import { getCurrentUser } from "@/libs/auth";
import { withServerErrorReference } from "@/libs/observability/server-render";

export const metadata: Metadata = { title: "帳號管理｜設定", description: "查看登入 Email、驗證狀態與註銷帳號。" };

async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <SettingsCard title="帳號管理" icon={<UserRoundCog aria-hidden="true" className="size-5" />}><AccountEmailSection user={user} /><div className="mt-5 sm:mt-6"><AccountClosureSection /></div></SettingsCard>;
}

export default withServerErrorReference(AccountSettingsPage, "/settings/account");
