import { ProfileHeroSection } from "@/components/(authenticated)/profile/ProfileHeroSection";
import { ProfileClubFootprint } from "@/components/(authenticated)/profile/ProfileClubFootprint";
import type { Metadata } from "next";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { getPublicProfile } from "./public-profile";
import { ProfileReviewCollection } from "@/components/(public)/profile/ProfileReviewCollection";
import type { QueryParamValue } from "@/libs/query-params";
import { reviewsService } from "@/services/reviews/reviews.service";
import { redirect } from "next/navigation";
import { buildQueryString } from "@/utils/url";
import { normalizeProfileReviewsQuery } from "@/services/reviews/review-query";
import { classifyQuerySeo } from "@/libs/query-seo";
import { createMetadataDescription } from "@/libs/metadata-content";
import { createPublicMetadata } from "@/libs/seo";
import { StructuredData } from "@/components/StructuredData";
import { siteConfigs } from "@/libs/siteConfigs";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, QueryParamValue>>;
};

async function profileMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { identity, clubFootprint } = await getPublicProfile((await params).id);
  const { indexable } = classifyQuerySeo((await searchParams) ?? {}, {
    reviewPage: "1",
    reviewSort: "newest",
  });
  const description = createMetadataDescription(
    clubFootprint === null
      ? "此帳號已註銷；公開個人頁面不再顯示原有身份資料。"
      : `查看「${identity.name}」在臺科大桌遊社公開的個人頁面、社團足跡與桌遊評價。`,
  );
  return {
    ...createPublicMetadata({
      title: identity.name,
      description,
      canonical: `/profile/${identity.id}`,
      image: identity.avatar
        ? { url: identity.avatar, alt: identity.name }
        : undefined,
    }),
    ...(!indexable || clubFootprint === null
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

async function PublicProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { identity, identityBadges, clubFootprint } = await getPublicProfile(id);
  const reviewQuery = normalizeProfileReviewsQuery((await searchParams) ?? {});
  const reviews = clubFootprint === null
    ? null
    : await reviewsService.listPublicByUser(identity.id, reviewQuery);

  if (reviews && reviews.totalPages > 0 && reviewQuery.page > reviews.totalPages) {
    redirect(`/profile/${identity.id}?${buildQueryString({ reviewSearch: reviewQuery.search, reviewRating: reviewQuery.rating, reviewSort: reviewQuery.sort === "newest" ? undefined : reviewQuery.sort, reviewPage: reviews.totalPages })}#profile-reviews`);
  }
  return (
    <section className="container max-w-5xl space-y-6 py-6 sm:space-y-8 sm:py-8">
      {clubFootprint !== null ? (
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url: new URL(`/profile/${identity.id}`, siteConfigs.url).toString(),
            mainEntity: {
              "@type": "Person",
              name: identity.name,
              ...(identity.avatar ? { image: identity.avatar } : {}),
            },
          }}
        />
      ) : null}
      <ProfileHeroSection user={identity} identityBadges={identityBadges.map((badge, index) => ({ ...badge, id: `public-badge-${index}` }))} details={clubFootprint === null ? <p className="mt-2 text-sm text-(--muted)">此帳號已註銷。</p> : undefined} />
      {clubFootprint !== null && <ProfileClubFootprint title="社團足跡" {...clubFootprint} />}
      {reviews ? <ProfileReviewCollection basePath={`/profile/${identity.id}`} reviews={reviews} query={reviewQuery} own={false} /> : null}
    </section>
  );
}

export const generateMetadata = withServerErrorReference(profileMetadata, "/profile/[id]");
export default withServerErrorReference(PublicProfilePage, "/profile/[id]");
