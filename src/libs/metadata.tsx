import type { Metadata } from "next";
import { siteConfigs } from "./siteConfigs";
import {
  DEFAULT_SOCIAL_IMAGE,
  GOOGLE_SITE_VERIFICATION,
  isProductionDeployment,
} from "./seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfigs.url),
  title: {
    default: `${siteConfigs.name}｜${siteConfigs.fullName}`,
    template: `%s｜${siteConfigs.name}`,
  },
  description: siteConfigs.description,
  applicationName: siteConfigs.name,
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: siteConfigs.name,
    title: `${siteConfigs.name}｜${siteConfigs.fullName}`,
    description: siteConfigs.description,
    url: "/",
    images: [{ url: DEFAULT_SOCIAL_IMAGE, alt: siteConfigs.fullName }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfigs.name}｜${siteConfigs.fullName}`,
    description: siteConfigs.description,
    images: [DEFAULT_SOCIAL_IMAGE],
  },
  verification: { google: GOOGLE_SITE_VERIFICATION },
  robots: isProductionDeployment()
    ? { index: true, follow: true }
    : { index: false, follow: false, noarchive: true },
  icons: [
    {
      rel: "icon",
      url: siteConfigs.icon,
    },
  ],
};
