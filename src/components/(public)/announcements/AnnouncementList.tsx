import Link from "next/link";

import type { Announcement } from "@/types/database";
import { formatDate } from "@/utils/date";

type AnnouncementListProps = {
  announcements: Announcement[];
};

export function AnnouncementList({ announcements }: AnnouncementListProps) {
  return (
    <ul>
      {announcements.map((announcement) => {
        const publishedAt =
          announcement.published_at ?? announcement.created_at;

        return (
          <li
            key={announcement.id}
            className="border-b border-(--border-muted)"
          >
            <article>
              <Link
                href={`/announcements/${announcement.id}`}
                className="group grid min-w-0 gap-1.5 px-1 py-3.5 transition-colors hover:bg-(--surface-subtle) focus-visible:bg-(--surface-subtle) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary) sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6 sm:px-2 sm:py-4"
              >
                <div className="min-w-0">
                  <h2
                    title={announcement.title}
                    className="line-clamp-2 break-words text-base leading-6 font-semibold text-(--text-primary) transition-colors group-hover:text-(--interactive-primary) sm:text-lg"
                  >
                    {announcement.title}
                  </h2>
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
          </li>
        );
      })}
    </ul>
  );
}
