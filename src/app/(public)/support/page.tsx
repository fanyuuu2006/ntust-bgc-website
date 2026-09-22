import type { Metadata } from "next";
import { CupSoda, Heart, ShieldCheck, Sparkles } from "lucide-react";

import { SupporterWall } from "@/components/(public)/support/SupporterWall";
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
      <Card
        surface="elevated"
        className="relative overflow-hidden border-l-4 border-l-(--game-yellow) p-5 sm:p-7 lg:p-9"
      >
        <div className="relative z-10 grid min-w-0 gap-8 md:grid-cols-2 md:items-center lg:gap-12">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-(--interactive-primary)">
              <Heart aria-hidden="true" className="size-4 fill-current" />
              一起讓網站慢慢變得更好
            </p>
            <h1 className="mt-2 max-w-2xl text-3xl leading-tight font-bold text-(--text-primary) sm:text-4xl">
              支持本站持續經營
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-(--text-secondary) sm:text-lg">
              如果這個網站對你有幫助，也可以請開發者喝杯飲料 🧋
            </p>

            <div className="mt-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button disabled size="lg" className="w-full sm:w-auto">
                <CupSoda aria-hidden="true" className="size-5" />
                請開發者喝杯飲料
              </Button>
              <span className="text-sm text-(--text-muted)">支持方式準備中</span>
            </div>

            <p className="mt-5 text-xs leading-5 text-(--text-muted) sm:text-sm">
              由網站開發者個人收取，並非社費或社團收入。
            </p>
          </div>

          <div aria-hidden="true" className="hidden items-center justify-center md:flex">
            <div
              className="relative flex items-center justify-center rounded-[2.5rem] bg-(--surface-subtle) shadow-(--shadow-base)"
              style={{ inlineSize: "11rem", blockSize: "11rem" }}
            >
              <div className="absolute -top-3 right-2 flex size-11 rotate-6 items-center justify-center rounded-2xl bg-(--game-yellow) text-(--text-primary) shadow-(--shadow-card)">
                <Sparkles className="size-5" />
              </div>
              <div className="absolute bottom-3 -left-3 size-8 -rotate-6 rounded-xl bg-(--game-blue) opacity-80" />
              <CupSoda className="size-20 text-(--interactive-primary) lg:size-24" strokeWidth={1.6} />
              <Heart className="absolute right-6 bottom-6 size-7 fill-(--game-red) text-(--game-red)" />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-10 sm:mt-12">
        <SupporterWall supporters={supporters} />
      </div>

      <section aria-labelledby="support-details-title" className="mt-10 border-t border-(--border-muted) pt-6 sm:mt-12 sm:pt-7">
        <div className="flex max-w-3xl items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-(--interactive-primary)" />
          <div className="min-w-0">
            <h2 id="support-details-title" className="font-semibold text-(--text-primary)">
              關於支持本站
            </h2>
            <p className="mt-1 text-sm leading-6 text-(--text-muted)">
              支持完全出於自願，由網站開發者個人收取，用於本站的開發與維護；不是臺科大或桌遊社的社費、捐款或社團收入，也不影響網站功能、社員資格或任何社團權益。
            </p>
            <p className="mt-2 text-sm leading-6 text-(--text-muted)">
              付款不會自動公開姓名；只有另行同意並經確認的公開暱稱會出現在感謝名單，也可以隨時要求撤回。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
