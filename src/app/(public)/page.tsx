import { HomeHero } from "@/components/(public)/home/HomeHero";
import { LatestAnnouncementsSection } from "@/components/(public)/home/LatestAnnouncementsSection";
import { PopularBoardGamesSection } from "@/components/(public)/home/PopularBoardGamesSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <LatestAnnouncementsSection />
      <PopularBoardGamesSection />
    </>
  );
}
