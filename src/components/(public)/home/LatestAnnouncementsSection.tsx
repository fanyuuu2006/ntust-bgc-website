import { reportUnexpectedError } from "@/libs/observability/report";
import { Suspense } from "react";
import { AnnouncementRow } from "@/components/(public)/announcements/AnnouncementRow";
import { announcementsService } from "@/services/announcements/announcements.service";
import { HomeSection } from "./HomeSection";

export function LatestAnnouncementsSection() {
  return <HomeSection id="latest-announcements" title="最新公告" description="掌握社團的最新消息。" action={{ label: "查看全部", href: "/announcements" }} className="bg-(--surface-default)"><Suspense fallback={<AnnouncementsLoading />}><LatestAnnouncementsContent /></Suspense></HomeSection>;
}

async function LatestAnnouncementsContent() {
  let announcements;
  try { announcements = await announcementsService.getHomepagePreview(); }
  catch (error) { reportUnexpectedError(error, { context: "home.announcements" }); }
  if (!announcements) return <p role="alert" className="py-8 text-sm text-(--text-muted)">最新公告暫時無法載入，請稍後再試。</p>;
  if (announcements.length === 0) return <p className="py-8 text-sm text-(--text-muted)">目前沒有最新公告。</p>;
  return <ul>{announcements.map((announcement) => <li key={announcement.id} className="border-b border-(--border-muted)"><AnnouncementRow announcement={announcement} density="compact" headingLevel={3} /></li>)}</ul>;
}

function AnnouncementsLoading() { return <div role="status" className="space-y-4 py-5" aria-label="公告載入中">{[0, 1, 2].map((item) => <div key={item} className="space-y-2 border-b border-(--border-muted) pb-4"><div className="skeleton skeleton-line h-4 w-24" /><div className="skeleton skeleton-line h-5 w-2/3" /></div>)}</div>; }
