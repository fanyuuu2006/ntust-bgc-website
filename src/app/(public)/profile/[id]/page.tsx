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
  const { identity, visibility } = await getPublicProfile((await params).id);
  const { indexable } = classifyQuerySeo((await searchParams) ?? {}, {
    reviewPage: "1",
    reviewSort: "newest",
  });
  const description = createMetadataDescription(
    visibility === "closed"
      ? "此帳號已註銷；公開個人頁面不再顯示原有身份資料。"
      : visibility === "limited"
        ? `「${identity.name}」已限制個人檔案的公開內容。`
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
    ...(!indexable || visibility !== "public"
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

async function PublicProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { identity, visibility, identityBadges, clubFootprint } = await getPublicProfile(id);
  const reviewQuery = normalizeProfileReviewsQuery((await searchParams) ?? {});
  // limited 與 closed 都在 Server 編排層停止評論查詢，不能只靠 JSX 隱藏。
  const reviews = visibility !== "public"
    ? null
    : await reviewsService.listPublicByUser(identity.id, reviewQuery);

  if (reviews && reviews.totalPages > 0 && reviewQuery.page > reviews.totalPages) {
    redirect(`/profile/${identity.id}?${buildQueryString({ reviewSearch: reviewQuery.search, reviewRating: reviewQuery.rating, reviewSort: reviewQuery.sort === "newest" ? undefined : reviewQuery.sort, reviewPage: reviews.totalPages })}#profile-reviews`);
  }
  return (
    <section className="container max-w-5xl space-y-6 py-6 sm:space-y-8 sm:py-8">
      {visibility === "public" ? (
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
      <ProfileHeroSection
        user={identity}
        identityBadges={identityBadges.map((badge, index) => ({ ...badge, id: `public-badge-${index}` }))}
        details={visibility === "closed"
          ? <p className="mt-2 text-sm text-(--muted)">此帳號已註銷。</p>
          : visibility === "limited"
            ? <p className="mt-2 text-sm text-(--muted)">此使用者已限制個人檔案的公開內容。</p>
            : undefined}
      />
      {visibility === "public" && clubFootprint !== null && <ProfileClubFootprint title="社團足跡" {...clubFootprint} />}
      {reviews ? <ProfileReviewCollection basePath={`/profile/${identity.id}`} reviews={reviews} query={reviewQuery} own={false} /> : null}
    </section>
  );
}

export const generateMetadata = withServerErrorReference(profileMetadata, "/profile/[id]");
export default withServerErrorReference(PublicProfilePage, "/profile/[id]");
