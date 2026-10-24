import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import type { SiteSettingsInput } from "@/services/site-settings/site-settings.schema";
import type { SiteSettingsRow } from "@/types/site-settings";

const SITE_SETTINGS_ID = true;

export const siteSettingsRepository = {
  find: async (): Promise<SiteSettingsRow | null> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", SITE_SETTINGS_ID)
      .maybeSingle();

    if (error) throwRepositoryError("取得網站設定失敗", error);
    return data as SiteSettingsRow | null;
  },

  upsert: async (input: SiteSettingsInput, updatedBy: string): Promise<SiteSettingsRow> => {
    const { data, error } = await supabase
      .from("site_settings")
      .upsert({
        id: SITE_SETTINGS_ID,
        site_name: input.siteName,
        site_full_name: input.siteFullName,
        seo_title: input.seoTitle,
        seo_description: input.seoDescription,
        contact_email: input.contactEmail ?? null,
        social_links: input.socialLinks,
        logo_media_url: input.logoMediaUrl ?? null,
        favicon_media_url: input.faviconMediaUrl ?? null,
        default_og_image_url: input.defaultOgImageUrl ?? null,
        hero_title: input.heroTitle ?? null,
        hero_description: input.heroDescription ?? null,
        hero_image_url: input.heroImageUrl ?? null,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throwRepositoryError("儲存網站設定失敗", error);
    return data as SiteSettingsRow;
  },
};
