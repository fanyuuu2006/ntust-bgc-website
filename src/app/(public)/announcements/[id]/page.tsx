import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/Button";
import {
  createMetadataDescription,
  createMetadataTitle,
} from "@/libs/metadata-content";
import { formatDate } from "@/utils/date";
import { getPublishedAnnouncement } from "./announcement-detail";

type AnnouncementDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AnnouncementDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const announcement = await getPublishedAnnouncement(id);
  const title = createMetadataTitle(announcement.title);
  const description = createMetadataDescription(announcement.content);
  const canonical = `/announcements/${announcement.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      publishedTime: announcement.published_at ?? announcement.created_at,
      modifiedTime: announcement.updated_at,
    },
  };
}

export default async function AnnouncementDetailPage({
  params,
}: AnnouncementDetailPageProps) {
  const { id } = await params;
  const announcement = await getPublishedAnnouncement(id);

  const publishedAt = announcement.published_at ?? announcement.created_at;

  return (
    <section className="py-8">
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

            <div className="mt-5 whitespace-pre-wrap wrap-anywhere [overflow-wrap:anywhere] text-base leading-7 text-(--text-primary)">
              {announcement.content}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
