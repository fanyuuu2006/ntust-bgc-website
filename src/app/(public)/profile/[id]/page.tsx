import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { ProfileClubFootprint } from "@/components/(authenticated)/profile/ProfileClubFootprint";
import type { Metadata } from "next";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { getPublicProfile } from "./public-profile";
import { ProfileReviews } from "@/components/(public)/profile/ProfileReviews";
import { readSingleQueryValue, type QueryParamValue } from "@/libs/query-params";
import { reviewsService } from "@/services/reviews/reviews.service";
import { redirect } from "next/navigation";
import { buildQueryString } from "@/utils/url";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, QueryParamValue>>;
};

async function profileMetadata({ params }: Props): Promise<Metadata> {
  const { identity } = await getPublicProfile((await params).id);
  return {
    title: "公開個人頁面",
    description: "查看使用者在本站公開的顯示名稱與頭像。",
    robots: { index: false, follow: true },
    alternates: { canonical: `/profile/${identity.id}` },
  };
}

async function PublicProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { identity, identityBadges, clubFootprint } = await getPublicProfile(id);
  const pageValue = Number(readSingleQueryValue((await searchParams)?.reviewPage));
  const reviewPage = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const reviews = clubFootprint === null
    ? null
    : await reviewsService.listPublicByUser(identity.id, { page: reviewPage, pageSize: 10 });

  if (reviews && reviews.totalPages > 0 && reviewPage > reviews.totalPages) {
    redirect(`/profile/${identity.id}?${buildQueryString({ reviewPage: reviews.totalPages })}#profile-reviews`);
  }
  return (
    <section className="container max-w-5xl space-y-6 py-6 sm:space-y-8 sm:py-8">
      <ProfileHeroSection user={identity} avatarReferrerPolicy="no-referrer" identityBadges={identityBadges.map((badge, index) => ({ ...badge, id: `public-badge-${index}` }))} details={clubFootprint === null ? <p className="mt-2 text-sm text-(--muted)">此帳號已註銷。</p> : undefined} />
      {clubFootprint !== null && <ProfileClubFootprint title="社團足跡" {...clubFootprint} />}
      {reviews ? <ProfileReviews userId={identity.id} reviews={reviews} /> : null}
    </section>
  );
}

export const generateMetadata = withServerErrorReference(profileMetadata, "/profile/[id]");
export default withServerErrorReference(PublicProfilePage, "/profile/[id]");
