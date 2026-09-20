import type { Metadata } from "next";

import { siteConfigs } from "./siteConfigs";

export const GOOGLE_SITE_VERIFICATION =
  "paT8VXRW0kGoDF345c4Bjx7IRwjxHlXKldHoDEn2zAE";
export const GOOGLE_ANALYTICS_ID = "G-ECHQ3K46E1";
export const DEFAULT_SOCIAL_IMAGE = "/images/home/hero.jpg";

export function isProductionDeployment(
  vercelEnvironment = process.env.VERCEL_ENV,
  nodeEnvironment = process.env.NODE_ENV,
): boolean {
  return vercelEnvironment
    ? vercelEnvironment === "production"
    : nodeEnvironment === "production";
}

type PublicMetadataOptions = {
  title: string;
  description: string;
  canonical: string;
  type?: "website" | "article";
  image?: { url: string; alt: string };
  absoluteTitle?: boolean;
};

export function createPublicMetadata({
  title,
  description,
  canonical,
  type = "website",
  image,
  absoluteTitle = false,
}: PublicMetadataOptions): Metadata {
  const socialImage = image ?? {
    url: DEFAULT_SOCIAL_IMAGE,
    alt: siteConfigs.fullName,
  };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: {
      type,
      locale: "zh_TW",
      siteName: siteConfigs.name,
      title,
      description,
      url: canonical,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage.url],
    },
  };
}
