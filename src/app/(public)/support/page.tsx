import type { Metadata } from "next";

import { SupporterWall } from "@/components/(public)/support/SupporterWall";
import { Button } from "@/components/ui/Button";
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
    <main className="container min-w-0 max-w-4xl py-8 sm:py-10 lg:py-12">
      <header className="max-w-3xl">
        <h1 className="text-3xl leading-tight font-bold text-(--text-primary) sm:text-4xl">
          支持本站持續經營
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-(--text-secondary) sm:text-lg">
          如果這個網站對你有幫助，也可以請開發者喝杯飲料。
        </p>

        <div className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button disabled size="lg" className="w-full sm:w-auto">
            請開發者喝杯飲料 🧋
          </Button>
          <span className="text-sm text-(--text-muted)">支持方式準備中</span>
        </div>

        <p className="mt-4 text-xs leading-5 text-(--text-muted) sm:text-sm">
          由網站開發者個人收取，並非社費或社團收入。
        </p>
      </header>

      <div className="mt-10 sm:mt-12">
        <SupporterWall supporters={supporters} />
      </div>

      <section aria-labelledby="support-details-title" className="mt-10 max-w-3xl border-t border-(--border-muted) pt-6 sm:mt-12">
        <h2 id="support-details-title" className="font-semibold text-(--text-primary)">
          關於支持本站
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--text-muted)">
          支持完全出於自願，由網站開發者個人收取，用於本站的開發與維護。這不是臺科大或桌遊社的社費、捐款或社團收入，也不影響網站功能、社員資格或任何社團權益。
        </p>
        <p className="mt-2 text-sm leading-6 text-(--text-muted)">
          付款不會自動公開姓名；只有另外同意並經確認的公開暱稱會出現在感謝名單，也可以隨時要求撤回。
        </p>
      </section>
    </main>
  );
}
