import "server-only";
import { cachePublicData, invalidatePublicData } from "@/libs/cache/public-data";

import { announcementsRepository, type FindPublishedAnnouncementsOptions } from "@/repositories/announcements.repository";
import type { AnnouncementId } from "@/types/database";
import { announcementInputSchema as inputSchema } from "./announcements.schema";
import { AnnouncementNotFoundError } from "./announcements.errors";

const homepagePreview = cachePublicData("announcements", () => announcementsRepository.findHomepagePreview());

export const announcementsService = {
  getHomepagePreview: homepagePreview,
  listPublished: (options: FindPublishedAnnouncementsOptions = {}) => announcementsRepository.findPublished(options),
  // Dashboard 只讀取同一批已發布公告，不將使用者資訊放入公開快取。
  getDashboardLatestPublished: async () => ({ data: await homepagePreview() }),
  getPublishedById: (id: AnnouncementId) => announcementsRepository.findPublishedById(id),
  listForAdmin: (options: FindPublishedAnnouncementsOptions & { published?: boolean } = {}) => announcementsRepository.findManyForAdmin(options),
  getForAdmin: (id: AnnouncementId) => announcementsRepository.findById(id),
  createForAdmin: async (authorId: string, input: unknown) => { const data = inputSchema.parse(input); const created = await announcementsRepository.create({ ...data, author_id: authorId, published_at: data.is_published ? new Date().toISOString() : null }); invalidatePublicData("announcements"); return created; },
  updateForAdmin: async (id: AnnouncementId, input: unknown) => { const current = await announcementsRepository.findById(id); if (!current) throw new AnnouncementNotFoundError(); const data = inputSchema.parse(input); const updated = await announcementsRepository.updateById(id, { ...data, published_at: data.is_published && !current.is_published ? new Date().toISOString() : data.is_published ? current.published_at : null }); invalidatePublicData("announcements"); return updated; },
  deleteForAdmin: async (id: AnnouncementId) => { const current = await announcementsRepository.findById(id); if (!current) throw new AnnouncementNotFoundError(); await announcementsRepository.deleteById(id); invalidatePublicData("announcements"); },
};
