import { withServerErrorReference } from "@/libs/observability/server-render";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { RichTextRenderer } from "@/components/RichTextRenderer";
import { plainTextFromStoredContent } from "@/libs/rich-content/content";
import { ButtonLink } from "@/components/ui/Button";
import {
  createMetadataDescription,
  createMetadataTitle,
} from "@/libs/metadata-content";
import { formatDate } from "@/utils/date";
import { getPublishedAnnouncement } from "./announcement-detail";
import { createPublicMetadata } from "@/libs/seo";
import { StructuredData } from "@/components/StructuredData";
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
      siteName: siteConfigs.name,
      title,
      description,
      url: canonical,
      images: [{ url: "/images/home/hero.jpg", alt: siteConfigs.fullName }],
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
            name: siteConfigs.fullName,
            url: siteConfigs.url,
          },
        }}
      />
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <ButtonLink
            href="/announcements"
            variant="text"
            size="sm"
            className="px-0"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            返回公告列表
          </ButtonLink>

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
