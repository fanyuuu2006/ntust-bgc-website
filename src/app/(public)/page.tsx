import { HomeHero } from "@/components/(public)/home/HomeHero";
import { LatestAnnouncementsSection } from "@/components/(public)/home/LatestAnnouncementsSection";
import { PopularBoardGamesSection } from "@/components/(public)/home/PopularBoardGamesSection";
import type { Metadata } from "next";
import { StructuredData } from "@/components/StructuredData";
import { createPublicMetadata } from "@/libs/seo";
import { siteConfigs } from "@/libs/siteConfigs";

export const metadata: Metadata = createPublicMetadata({
  title: `${siteConfigs.name}｜${siteConfigs.fullName}`,
  description:
    "臺科大桌遊社官方網站，查看社團公告、探索桌遊，認識國立臺灣科技大學桌上遊戲研究社。",
  canonical: "/",
  absoluteTitle: true,
});

export default function HomePage() {
  return (
    <>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteConfigs.fullName,
            alternateName: [siteConfigs.name, "台科大桌遊社"],
            url: siteConfigs.url,
            logo: new URL(siteConfigs.logo, siteConfigs.url).toString(),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfigs.name,
            alternateName: siteConfigs.fullName,
            url: siteConfigs.url,
            inLanguage: "zh-Hant",
          },
        ]}
      />
      <HomeHero />
      <LatestAnnouncementsSection />
      <PopularBoardGamesSection />
    </>
  );
}
