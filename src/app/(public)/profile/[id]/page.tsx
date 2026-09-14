import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { ProfileClubFootprint } from "@/components/(authenticated)/profile/ProfileClubFootprint";
import type { Metadata } from "next";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { getPublicProfile } from "./public-profile";

type Props = { params: Promise<{ id: string }> };

async function profileMetadata({ params }: Props): Promise<Metadata> {
  const { identity } = await getPublicProfile((await params).id);
  return {
    title: "公開個人頁面",
    description: "查看使用者在本站公開的顯示名稱與頭像。",
    robots: { index: false, follow: true },
    alternates: { canonical: `/profile/${identity.id}` },
  };
}

async function PublicProfilePage({ params }: Props) {
  const { identity, identityBadges, clubFootprint } = await getPublicProfile((await params).id);
  return (
    <section className="container max-w-5xl space-y-6 py-6 sm:space-y-8 sm:py-8">
      <ProfileHeroSection user={identity} avatarReferrerPolicy="no-referrer" identityBadges={identityBadges.map((badge, index) => ({ ...badge, id: `public-badge-${index}` }))} details={clubFootprint === null ? <p className="mt-2 text-sm text-(--muted)">此帳號已註銷。</p> : undefined} />
      {clubFootprint !== null && <ProfileClubFootprint title="社團足跡" {...clubFootprint} />}
    </section>
  );
}

export const generateMetadata = withServerErrorReference(profileMetadata, "/profile/[id]");
export default withServerErrorReference(PublicProfilePage, "/profile/[id]");
