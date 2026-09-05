import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";

import { AnnouncementRow } from "@/components/(public)/announcements/AnnouncementRow";
import { announcementsService } from "@/services/announcements/announcements.service";

export function LatestAnnouncementsSection() {
  return (
    <section
      id="latest-announcements"
      aria-labelledby="latest-announcements-title"
      className="scroll-mt-20 bg-(--surface-default)"
    >
      <div className="container py-10 sm:py-14 lg:py-16">
        <div className="flex flex-col items-start gap-2 pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h2
              id="latest-announcements-title"
              className="text-2xl font-bold text-(--text-primary) sm:text-3xl"
            >
              最新公告
            </h2>
            <p className="mt-1 text-sm text-(--text-muted) sm:text-base">
              看看社團最近有哪些消息。
            </p>
          </div>
          <Link
            href="/announcements"
            className="inline-flex min-h-10 shrink-0 items-center gap-1 text-sm font-semibold text-(--interactive-primary) hover:text-(--interactive-primary-hover) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--primary)"
          >
            查看所有公告
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <Suspense fallback={<AnnouncementsLoading />}>
          <LatestAnnouncementsContent />
        </Suspense>
      </div>
    </section>
  );
}

async function LatestAnnouncementsContent() {
  let announcements;

  try {
    announcements = await announcementsService.listPublished({
      page: 1,
      pageSize: 3,
    });
  } catch (error) {
    console.error("[Homepage] 讀取最新公告失敗", error);
  }

  if (!announcements) {
    return <p className="py-8 text-sm text-(--text-muted)">最新公告暫時無法載入，請稍後再試。</p>;
  }

  if (announcements.data.length === 0) {
    return <p className="py-8 text-sm text-(--text-muted)">目前沒有最新公告</p>;
  }

  return (
    <ul>
      {announcements.data.map((announcement) => (
        <li
          key={announcement.id}
          className="border-b border-(--border-muted)"
        >
          <AnnouncementRow
            announcement={announcement}
            density="compact"
            headingLevel={3}
          />
        </li>
      ))}
    </ul>
  );
}

function AnnouncementsLoading() {
  return (
    <div role="status" className="space-y-4 py-5" aria-label="正在載入最新公告">
      {[0, 1, 2].map((item) => (
        <div key={item} className="space-y-2 border-b border-(--border-muted) pb-4">
          <div className="skeleton skeleton-line h-4 w-24" />
          <div className="skeleton skeleton-line h-5 w-2/3" />
        </div>
      ))}
    </div>
  );
}
