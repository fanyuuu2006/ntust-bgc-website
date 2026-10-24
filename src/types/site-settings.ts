export type SiteSocialLink = {
  label: string;
  href: string;
};

export type SiteSettings = {
  siteName: string;
  siteFullName: string;
  seoTitle: string;
  seoDescription: string;
  contactEmail: string | null;
  socialLinks: SiteSocialLink[];
  logoMediaUrl: string | null;
  faviconMediaUrl: string | null;
  defaultOgImageUrl: string | null;
  heroTitle: string | null;
  heroDescription: string | null;
  heroImageUrl: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type SiteSettingsRow = {
  id: boolean;
  site_name: string;
  site_full_name: string;
  seo_title: string;
  seo_description: string;
  contact_email: string | null;
  social_links: unknown;
  logo_media_url: string | null;
  favicon_media_url: string | null;
  default_og_image_url: string | null;
  hero_title: string | null;
  hero_description: string | null;
  hero_image_url: string | null;
  updated_at: string;
  updated_by: string | null;
};
