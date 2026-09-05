import { existsSync } from "node:fs";
import { join } from "node:path";

import { ArrowDown } from "lucide-react";
import Image from "next/image";

import { ButtonLink } from "@/components/ui/Button";
import { siteConfigs } from "@/libs/siteConfigs";

const HERO_IMAGE_SRC = "/images/home/hero.jpg";
const hasHeroImage = existsSync(
  join(process.cwd(), "public", "images", "home", "hero.jpg"),
);

export function HomeHero() {
  return (
    <section className="relative isolate flex min-h-104 overflow-hidden bg-(--primary-dark) text-(--text-inverse) sm:min-h-110 lg:min-h-124">
      {hasHeroImage ? (
        <>
          <Image
            src={HERO_IMAGE_SRC}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-black/40 lg:bg-transparent lg:bg-linear-to-r lg:from-black/60 lg:via-black/30 lg:to-black/10"
          />
        </>
      ) : null}

      <div className="container relative z-10 flex items-center py-12 sm:py-16 lg:py-20">
        <div className="relative max-w-2xl">
          <p className="text-sm leading-6 font-medium tracking-wide text-white/75 sm:text-base">
            {siteConfigs.fullName}
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {siteConfigs.name}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/85 sm:text-lg">
            一起玩桌遊，也一起玩出更多可能。
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="#popular-board-games" size="lg" variant="primary">
              找桌遊
              <ArrowDown aria-hidden="true" className="size-4" />
            </ButtonLink>
            <ButtonLink
              href="#latest-announcements"
              size="lg"
              variant="outline"
            >
              最新公告
              <ArrowDown aria-hidden="true" className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
