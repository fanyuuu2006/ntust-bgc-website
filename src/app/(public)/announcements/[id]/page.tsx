import Link from "next/link";
import { notFound } from "next/navigation";

import { announcementsService } from "@/services/announcements/announcements.service";
import { positiveIntegerIdSchema } from "@/libs/zod/ids";
import { formatDate } from "@/utils/date";

export default async function AnnouncementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveIntegerIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const announcement = await announcementsService.getPublishedById(id.data);
  if (!announcement) notFound();
  return <article className="container max-w-4xl py-8"><Link href="/announcements" className="text-sm font-medium text-(--primary)">← 返回公告列表</Link><div className="card mt-5 rounded-2xl p-5 sm:p-8"><p className="text-sm text-(--muted)">{announcement.published_at ? formatDate(announcement.published_at) : formatDate(announcement.created_at)}</p><h1 className="mt-3 text-2xl font-bold sm:text-3xl">{announcement.title}</h1><div className="mt-6 whitespace-pre-wrap text-base leading-8 text-(--foreground)">{announcement.content}</div></div></article>;
}
