import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { positiveIntegerIdSchema } from "@/libs/zod/ids";
import { announcementsService } from "@/services/announcements/announcements.service";

export const getPublishedAnnouncement = cache(async (rawId: string) => {
  const id = positiveIntegerIdSchema.safeParse(rawId);
  if (!id.success) notFound();

  const announcement = await announcementsService.getPublishedById(id.data);
  if (!announcement) notFound();

  return announcement;
});
