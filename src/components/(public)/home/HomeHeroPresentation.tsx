/* eslint-disable @next/next/no-img-element -- blob URL preview does not use Image optimizer. */
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import type { SitePresentation } from "@/libs/site-settings/presentation";
import { cn } from "@/utils/className";

type Props = Pick<SitePresentation, "siteName" | "siteFullName" | "heroTitle" | "heroDescription" | "heroImageUrl"> & { preview?: boolean; className?: string };

function HeroCta({ label, href, variant, preview }: { label: string; href: string; variant: "primary" | "outline"; preview: boolean }) {
  const content = <><span>{label}</span><ArrowDown aria-hidden="true" className="size-4 shrink-0" /></>;
  if (preview) return <span aria-hidden="true" className={cn("btn inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-base font-medium", variant)}>{content}</span>;
  return <ButtonLink href={href} size="lg" variant={variant}>{content}</ButtonLink>;
}

export function HomeHeroPresentation({ siteName, siteFullName, heroTitle, heroDescription, heroImageUrl, preview = false, className }: Props) {
  return <section className={cn("relative isolate flex min-h-104 overflow-hidden bg-(--primary-dark) text-(--text-on-image) sm:min-h-110 lg:min-h-124", className)}>
    {preview ? <img src={heroImageUrl} alt="" className="absolute inset-0 size-full object-cover object-center" /> : <Image src={heroImageUrl} alt="" fill priority sizes="100vw" className="object-cover object-center" />}
    <div aria-hidden="true" className="hero-image-overlay absolute inset-0" />
    <div className="container relative z-10 flex items-center py-12 sm:py-16 lg:py-20"><div className="relative max-w-2xl">
      <p className="font-semibold leading-6 tracking-wide text-(--text-on-image) sm:text-lg">{siteName}</p>
      <p className="mt-1 text-sm font-medium leading-6 text-(--text-on-image-muted) sm:text-base">{siteFullName}</p>
      <h1 className="mt-5 max-w-xl text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">{heroTitle}</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-(--text-on-image-muted)">{heroDescription}</p>
      <div className="mt-7 flex flex-wrap gap-3" aria-hidden={preview || undefined}>
        <HeroCta label="找桌遊" href="#popular-board-games" variant="primary" preview={preview} />
        <HeroCta label="最新公告" href="#latest-announcements" variant="outline" preview={preview} />
      </div>
    </div></div>
  </section>;
}

