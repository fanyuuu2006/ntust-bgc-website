import { HomeHero } from "@/components/(public)/home/HomeHero";
import { LatestAnnouncementsSection } from "@/components/(public)/home/LatestAnnouncementsSection";
import { PopularBoardGamesSection } from "@/components/(public)/home/PopularBoardGamesSection";
import type { Metadata } from "next";
import { StructuredData } from "@/components/StructuredData";
import { createPublicMetadata } from "@/libs/seo";
import { siteConfigs } from "@/libs/siteConfigs";
import { getPublicSiteSettings } from "@/libs/site-settings/public";
import { resolveSitePresentation } from "@/libs/site-settings/presentation";

export async function generateMetadata(): Promise<Metadata> {
  const site = resolveSitePresentation(await getPublicSiteSettings());
  return createPublicMetadata({ title: site.seoTitle, description: site.seoDescription, canonical: "/", image: { url: site.socialImageUrl, alt: site.siteFullName }, absoluteTitle: true });
}

export default async function HomePage() {
  const settings = await getPublicSiteSettings();
  const site = resolveSitePresentation(settings);
  return (
    <>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: site.siteFullName,
            alternateName: [site.siteName, "台科大桌遊社"],
            url: siteConfigs.url,
            logo: new URL(site.logoUrl, siteConfigs.url).toString(),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: site.siteName,
            alternateName: site.siteFullName,
            url: siteConfigs.url,
            inLanguage: "zh-Hant",
          },
        ]}
      />
      <HomeHero settings={settings} />
      <LatestAnnouncementsSection />
      <PopularBoardGamesSection />
    </>
  );
}
