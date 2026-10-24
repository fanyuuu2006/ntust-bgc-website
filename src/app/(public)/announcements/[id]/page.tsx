import { withServerErrorReference } from "@/libs/observability/server-render";
import type { Metadata } from "next";

import { RichTextRenderer } from "@/components/RichTextRenderer";
import { plainTextFromStoredContent } from "@/libs/rich-content/content";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  createMetadataDescription,
  createMetadataTitle,
} from "@/libs/metadata-content";
import { formatDate } from "@/utils/date";
import { getPublishedAnnouncement } from "./announcement-detail";
import { createPublicMetadata } from "@/libs/seo";
import { StructuredData } from "@/components/StructuredData";
import { getPublicSiteSettings } from "@/libs/site-settings/public";
import { resolveSitePresentation } from "@/libs/site-settings/presentation";
import { siteConfigs } from "@/libs/siteConfigs";

type AnnouncementDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function generateMetadataContent({
  params,
}: AnnouncementDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const announcement = await getPublishedAnnouncement(id);
  const title = createMetadataTitle(announcement.title);
  const description = createMetadataDescription(plainTextFromStoredContent(announcement));
  const canonical = `/announcements/${announcement.id}`;
  const site = resolveSitePresentation(await getPublicSiteSettings());

  return {
    ...createPublicMetadata({
      title,
      description,
      canonical,
      type: "article",
    }),
    openGraph: {
      type: "article",
      locale: "zh_TW",
      siteName: site.siteName,
      title,
      description,
      url: canonical,
      images: [{ url: site.socialImageUrl, alt: site.siteFullName }],
      publishedTime: announcement.published_at ?? announcement.created_at,
      modifiedTime: announcement.updated_at,
    },
  };
}

async function AnnouncementDetailPage({
  params,
}: AnnouncementDetailPageProps) {
  const { id } = await params;
  const announcement = await getPublishedAnnouncement(id);
  const site = resolveSitePresentation(await getPublicSiteSettings());

  const publishedAt = announcement.published_at ?? announcement.created_at;

  return (
    <section className="py-8">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: announcement.title,
          description: createMetadataDescription(
            plainTextFromStoredContent(announcement),
          ),
          datePublished: announcement.published_at ?? announcement.created_at,
          dateModified: announcement.updated_at,
          url: new URL(`/announcements/${announcement.id}`, siteConfigs.url).toString(),
          publisher: {
            "@type": "Organization",
            name: site.siteFullName,
            url: siteConfigs.url,
          },
        }}
      />
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs items={[{ href: "/", label: "首頁" }, { href: "/announcements", label: "公告" }, { label: announcement.title }]} />

          <article className="mt-5 min-w-0">
            <header className="border-b border-(--border-muted) pb-5">
              <time
                dateTime={publishedAt}
                className="block text-sm leading-5 text-(--text-muted)"
              >
                {formatDate(publishedAt)}
              </time>
              <h1 className="mt-2 wrap-anywhere text-2xl leading-tight font-bold text-(--text-primary) sm:text-3xl">
                {announcement.title}
              </h1>
            </header>

            <RichTextRenderer {...announcement} className="mt-5" />
          </article>
        </div>
      </div>
    </section>
  );
}

export const generateMetadata = withServerErrorReference(generateMetadataContent, "/announcements/[id]");
export default withServerErrorReference(AnnouncementDetailPage, "/announcements/[id]");
