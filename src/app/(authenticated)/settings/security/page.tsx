import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { PasswordSettingsForm } from "@/components/(authenticated)/settings/PasswordSettingsForm";
import { SessionSettingsSection } from "@/components/(authenticated)/settings/SessionSettingsSection";
import { SettingsCard } from "@/components/(authenticated)/settings/SettingsCard";
import { getCurrentUser } from "@/libs/auth";
import { withServerErrorReference } from "@/libs/observability/server-render";

export const metadata: Metadata = { title: "安全性｜設定", description: "變更密碼並管理登入工作階段。" };

async function SecuritySettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <SettingsCard title="安全性" icon={<ShieldCheck aria-hidden="true" className="size-5" />}><PasswordSettingsForm /><div className="mt-5 border-t border-(--border-default) pt-5 sm:mt-6 sm:pt-6"><SessionSettingsSection userId={user.id} /></div></SettingsCard>;
}

export default withServerErrorReference(SecuritySettingsPage, "/settings/security");
