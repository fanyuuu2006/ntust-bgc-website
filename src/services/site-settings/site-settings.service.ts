import "server-only";

import { siteConfigs } from "@/libs/siteConfigs";
import { siteSettingsRepository } from "@/repositories/site-settings.repository";
import { RepositoryError } from "@/repositories/shared/errors";
import { siteSettingsPatchSchema, siteSettingsSchema, type SiteSettingsInput } from "./site-settings.schema";
import type { SiteSettings, SiteSettingsRow } from "@/types/site-settings";

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: siteConfigs.name,
  siteFullName: siteConfigs.fullName,
  seoTitle: siteConfigs.title,
  seoDescription: siteConfigs.description,
  contactEmail: "ntustboardgame@gmail.com",
  socialLinks: [{ label: "Instagram", href: "https://www.instagram.com/ntust_boardgame/" }],
  logoMediaUrl: siteConfigs.logo,
  faviconMediaUrl: siteConfigs.icon,
  defaultOgImageUrl: "/images/home/hero.jpg",
  heroTitle: null,
  heroDescription: null,
  heroImageUrl: "/images/home/hero.jpg",
  updatedAt: null,
  updatedBy: null,
};

function getSafeReadDiagnostic(error: unknown): { type: string; code?: string } {
  if (!(error instanceof RepositoryError)) {
    return { type: error instanceof Error ? error.name : "UnknownError" };
  }

  const cause = error.cause;
  const code = typeof cause === "object" && cause !== null && "code" in cause
    && typeof cause.code === "string"
    ? cause.code
    : undefined;
  return { type: "RepositoryError", ...(code ? { code } : {}) };
}

function parseSocialLinks(value: unknown): SiteSettings["socialLinks"] {
  if (!Array.isArray(value)) return DEFAULT_SITE_SETTINGS.socialLinks;
  return value.filter((item): item is SiteSettings["socialLinks"][number] => (
    typeof item === "object" && item !== null &&
    typeof (item as { label?: unknown }).label === "string" &&
    typeof (item as { href?: unknown }).href === "string"
  ));
}

function toSiteSettings(row: SiteSettingsRow): SiteSettings {
  return {
    siteName: row.site_name,
    siteFullName: row.site_full_name,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    contactEmail: row.contact_email,
    socialLinks: parseSocialLinks(row.social_links),
    logoMediaUrl: row.logo_media_url,
    faviconMediaUrl: row.favicon_media_url,
    defaultOgImageUrl: row.default_og_image_url,
    heroTitle: row.hero_title,
    heroDescription: row.hero_description,
    heroImageUrl: row.hero_image_url,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

export const siteSettingsService = {
  getPublic: async (): Promise<SiteSettings> => {
    try {
      const row = await siteSettingsRepository.find();
      return row ? toSiteSettings(row) : DEFAULT_SITE_SETTINGS;
    } catch (error) {
      // 公開 fallback 不應洩漏 SQL 訊息；保留固定來源與錯誤碼供部署診斷。
      console.error("[SiteSettings] Failed to read settings; using fallback", getSafeReadDiagnostic(error));
      return DEFAULT_SITE_SETTINGS;
    }
  },

  update: async (input: unknown, updatedBy: string): Promise<SiteSettings> => {
    const patch = siteSettingsPatchSchema.parse(input);
    const current = await siteSettingsRepository.find();
    const values = siteSettingsSchema.parse(current ? {
      siteName: current.site_name,
      siteFullName: current.site_full_name,
      seoTitle: current.seo_title,
      seoDescription: current.seo_description,
      contactEmail: current.contact_email,
      socialLinks: parseSocialLinks(current.social_links),
      logoMediaUrl: current.logo_media_url,
      faviconMediaUrl: current.favicon_media_url,
      defaultOgImageUrl: current.default_og_image_url,
      heroTitle: current.hero_title,
      heroDescription: current.hero_description,
      heroImageUrl: current.hero_image_url,
      ...patch,
    } : { ...DEFAULT_SITE_SETTINGS, ...patch });
    const row = await siteSettingsRepository.upsert(values, updatedBy);
    return toSiteSettings(row);
  },
};

export { DEFAULT_SITE_SETTINGS };
export type { SiteSettingsInput };
