import { HomeHero } from "@/components/(public)/home/HomeHero";
import { LatestAnnouncementsSection } from "@/components/(public)/home/LatestAnnouncementsSection";
import { PopularBoardGamesSection } from "@/components/(public)/home/PopularBoardGamesSection";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <LatestAnnouncementsSection />
      <PopularBoardGamesSection />
    </>
  );
}
