import type { Metadata } from "next";

import { SupporterWall } from "@/components/(public)/support/SupporterWall";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createPublicMetadata } from "@/libs/seo";
import { supportService } from "@/services/support/support.service";

export const metadata: Metadata = createPublicMetadata({
  title: "支持本站持續經營",
  description: "自願支持臺科大桌遊社網站的開發與維護，並感謝願意公開暱稱的支持者。",
  canonical: "/support",
});

export default async function SupportPage() {
  const supporters = await supportService.listPublicSupporters();

  return (
    <main className="container min-w-0 max-w-5xl py-8 sm:py-10 lg:py-12">
      <PageHeader
        title="支持本站持續經營"
        description="網站從開發、維護到持續改善，都需要投入時間與心力。"
      />

      <Card className="mt-6 p-5 sm:p-6">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="min-w-0 max-w-2xl">
            <p className="text-base leading-7 font-semibold text-(--text-primary) sm:text-lg">
              如果本站曾經幫上忙，也可以請開發者喝杯飲料。
            </p>
            <p className="mt-1.5 text-sm leading-6 text-(--text-muted)">
              支持款項由網站開發者個人收取，用於本站的開發與維護。
            </p>
          </div>

          <div className="shrink-0 sm:text-right">
            <Button disabled size="lg" className="w-full sm:w-auto" aria-describedby="support-method-status">
              請開發者喝杯飲料 🧋
            </Button>
            <p id="support-method-status" className="mt-2 text-sm text-(--text-muted)">
              支持方式準備中
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-10 sm:mt-12">
        <SupporterWall supporters={supporters} />
      </div>

      <section
        aria-labelledby="support-details-title"
        className="mt-10 max-w-3xl border-t border-(--border-muted) pt-6 sm:mt-12 sm:pt-8"
      >
        <h2 id="support-details-title" className="text-lg font-semibold text-(--text-primary)">
          關於支持本站
        </h2>
        <div className="mt-2 space-y-2 text-sm leading-6 text-(--text-muted)">
          <p>
            支持完全出於自願，由網站開發者個人收取；並非臺科大或桌遊社的社費、捐款或社團收入。不支持也不影響網站功能、社員資格或其他社團權益。
          </p>
          <p>
            付款不會自動公開姓名。只有另外同意並經確認的公開暱稱會出現在感謝名單，也可以隨時要求撤回。
          </p>
        </div>
      </section>
    </main>
  );
}
