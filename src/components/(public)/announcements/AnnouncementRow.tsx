import Link from "next/link";

import type { Announcement } from "@/types/database";
import { cn } from "@/utils/className";
import { formatDate } from "@/utils/date";

type AnnouncementRowProps = {
  announcement: Announcement;
  density?: "compact" | "default";
  headingLevel: 2 | 3;
};

export function AnnouncementRow({
  announcement,
  density = "default",
  headingLevel,
}: AnnouncementRowProps) {
  const publishedAt =
    announcement.published_at ?? announcement.created_at;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <article>
      <Link
        href={`/announcements/${announcement.id}`}
        className={cn(
          "group grid min-w-0 gap-1.5 px-2 transition-colors hover:bg-(--surface-subtle) focus-visible:bg-(--surface-subtle) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6",
          density === "compact" ? "py-3 sm:py-3.5" : "py-3.5 sm:py-4",
        )}
      >
        <div className="min-w-0">
          <Heading
            title={announcement.title}
            className="line-clamp-2 break-words text-base leading-6 font-semibold text-(--text-primary) transition-colors group-hover:text-(--interactive-primary) sm:text-lg"
          >
            {announcement.title}
          </Heading>
          {announcement.content ? (
            <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-(--text-secondary)">
              {announcement.content}
            </p>
          ) : null}
        </div>

        <time
          dateTime={publishedAt}
          className="order-first text-sm leading-5 font-normal whitespace-nowrap text-(--text-muted) sm:order-none sm:justify-self-end sm:text-right"
        >
          {formatDate(publishedAt)}
        </time>
      </Link>
    </article>
  );
}
