import { resolveMediaDisplayUrl } from "@/libs/media/media-url";
import { siteConfigs } from "@/libs/siteConfigs";
import type { SiteSettings } from "@/types/site-settings";

export type SitePresentation = {
  siteName: string;
  siteFullName: string;
  logoUrl: string;
  faviconUrl: string;
  heroTitle: string;
  heroDescription: string;
  heroImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  socialImageUrl: string;
};

const DEFAULT_HERO_TITLE = "一起玩桌遊，也一起玩出更多可能。";
const DEFAULT_HERO_DESCRIPTION = "查看最新公告、探索社團桌遊，和我們一起享受桌遊的樂趣。";
const DEFAULT_HERO_IMAGE = "/images/home/hero.jpg";

function resolveImage(value: string | null, fallback: string): string {
  return (value && resolveMediaDisplayUrl(value)) || fallback;
}

/** 將資料庫設定與程式預設值解析成公開網站及後台預覽共用的展示資料。 */
export function resolveSitePresentation(settings: SiteSettings): SitePresentation {
  return {
    siteName: settings.siteName || siteConfigs.name,
    siteFullName: settings.siteFullName || siteConfigs.fullName,
    logoUrl: resolveImage(settings.logoMediaUrl, siteConfigs.logo),
    faviconUrl: resolveImage(settings.faviconMediaUrl, siteConfigs.icon),
    heroTitle: settings.heroTitle || DEFAULT_HERO_TITLE,
    heroDescription: settings.heroDescription || DEFAULT_HERO_DESCRIPTION,
    heroImageUrl: resolveImage(settings.heroImageUrl, DEFAULT_HERO_IMAGE),
    seoTitle: settings.seoTitle || `${siteConfigs.name}｜${siteConfigs.fullName}`,
    seoDescription: settings.seoDescription || siteConfigs.description,
    socialImageUrl: resolveImage(settings.defaultOgImageUrl, DEFAULT_HERO_IMAGE),
  };
}
