import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/ui/Button";
import { positiveIntegerIdSchema } from "@/libs/zod/ids";
import { announcementsService } from "@/services/announcements/announcements.service";
import { formatDate } from "@/utils/date";

type AnnouncementDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnnouncementDetailPage({
  params,
}: AnnouncementDetailPageProps) {
  const id = positiveIntegerIdSchema.safeParse((await params).id);
  if (!id.success) notFound();

  const announcement = await announcementsService.getPublishedById(id.data);
  if (!announcement) notFound();

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

          <article className="mt-4 min-w-0">
            <header className="border-b border-(--border-muted) pb-6">
              <time
                dateTime={publishedAt}
                className="block text-sm leading-5 text-(--text-muted)"
              >
                {formatDate(publishedAt)}
              </time>
              <h1 className="mt-2 break-words text-2xl leading-tight font-bold text-(--text-primary) sm:text-3xl">
                {announcement.title}
              </h1>
            </header>

            <div className="mt-6 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-base leading-7 text-(--text-primary)">
              {announcement.content}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
