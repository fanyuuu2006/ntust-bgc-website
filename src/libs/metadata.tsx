import type { Metadata } from "next";
import { siteConfigs } from "./siteConfigs";
import {
  DEFAULT_SOCIAL_IMAGE,
  GOOGLE_SITE_VERIFICATION,
  isProductionDeployment,
} from "./seo";
import { resolveSitePresentation } from "./site-settings/presentation";
import type { SiteSettings } from "@/types/site-settings";

export function createRootMetadata(settings: SiteSettings): Metadata {
  const site = resolveSitePresentation(settings);
  return {
  metadataBase: new URL(siteConfigs.url),
  title: {
    default: site.seoTitle,
    template: `%s｜${site.siteName}`,
  },
  description: site.seoDescription,
  applicationName: site.siteName,
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: site.siteName,
    title: site.seoTitle,
    description: site.seoDescription,
    url: "/",
    images: [{ url: site.socialImageUrl || DEFAULT_SOCIAL_IMAGE, alt: site.siteFullName }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.seoTitle,
    description: site.seoDescription,
    images: [site.socialImageUrl || DEFAULT_SOCIAL_IMAGE],
  },
  verification: { google: GOOGLE_SITE_VERIFICATION },
  robots: isProductionDeployment()
    ? { index: true, follow: true }
    : { index: false, follow: false, noarchive: true },
  icons: [
    {
      rel: "icon",
      url: site.faviconUrl,
    },
  ],
  };
}
