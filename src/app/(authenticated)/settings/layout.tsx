import type { Metadata } from "next";

import { SettingsNavigation } from "@/components/(authenticated)/settings/SettingsNavigation";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "設定",
  description: "管理您的帳號、個人資料與安全性設定",
};
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="container max-w-6xl space-y-4 py-4 sm:space-y-6 sm:py-8">
      <PageHeader
        title="設定"
        description={
          <span className="hidden sm:inline">
            管理個人資料、外觀、安全性與帳號。
          </span>
        }
      />
      <div className="grid min-w-0 gap-3 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-6">
        <SettingsNavigation />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
