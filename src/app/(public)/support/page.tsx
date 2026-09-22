import type { Metadata } from "next";

import { PageHeader } from "@/components/PageHeader";
import { SupporterWall } from "@/components/(public)/support/SupporterWall";
import { Card } from "@/components/ui/Card";
import { createPublicMetadata } from "@/libs/seo";
import { supportService } from "@/services/support/support.service";

export const metadata: Metadata = createPublicMetadata({
  title: "支持本站持續經營",
  description: "了解如何自願支持臺科大桌遊社網站的開發與維護，並看看同意公開暱稱的支持者。",
  canonical: "/support",
});

export default async function SupportPage() {
  const supporters = await supportService.listPublicSupporters();

  return (
    <div className="container min-w-0 max-w-3xl space-y-6 py-8 sm:space-y-8 sm:py-10">
      <PageHeader
        title="支持本站持續經營"
        description="如果這個網站對你有幫助，也可以請開發者喝杯飲料 🧋"
      />

      <Card className="space-y-4 p-4 sm:p-6">
        <p className="text-sm leading-7 text-(--text-secondary) sm:text-base">
          本頁的自願支持款項由網站開發者個人收取，用於支持本站的開發與維護；並非臺科大或桌遊社收取的社費、捐款或社團收入。是否支持、支持金額及是否公開暱稱，都不影響網站功能、社員資格或任何社團權益。
        </p>
        <p className="rounded-lg bg-(--surface-subtle) px-4 py-3 text-sm text-(--text-muted)">
          支持方式準備中。確認合適的第三方平台後，這裡才會提供付款連結。
        </p>
      </Card>

      <SupporterWall supporters={supporters} />

      <p className="text-sm leading-6 text-(--text-muted)">
        付款不會自動公開姓名。支持者另行同意、經確認後才會在此展示公開暱稱；也可以要求撤回公開。
      </p>
    </div>
  );
}
