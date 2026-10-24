import { HomeHeroPresentation } from "@/components/(public)/home/HomeHeroPresentation";
import { resolveSitePresentation } from "@/libs/site-settings/presentation";
import type { SiteSettings } from "@/types/site-settings";

export function HomeHero({ settings }: { settings: SiteSettings }) {
  return <HomeHeroPresentation {...resolveSitePresentation(settings)} />;
}
