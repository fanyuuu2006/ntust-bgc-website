import "server-only";

import { announcementsRepository, type FindPublishedAnnouncementsOptions } from "@/repositories/announcements.repository";
import type { AnnouncementId } from "@/types/database";
import { z } from "zod";
const inputSchema = z.object({ title: z.string().trim().min(1).max(160), content: z.string().trim().min(1).max(20000), is_published: z.boolean() });
const DASHBOARD_ANNOUNCEMENT_LIMIT = 3;

export const announcementsService = {
  listPublished: (options: FindPublishedAnnouncementsOptions = {}) => announcementsRepository.findPublished(options),
  getDashboardLatestPublished: () => announcementsRepository.findPublished({ page: 1, pageSize: DASHBOARD_ANNOUNCEMENT_LIMIT }),
  getPublishedById: (id: AnnouncementId) => announcementsRepository.findPublishedById(id),
  listForAdmin: (options: FindPublishedAnnouncementsOptions & { published?: boolean } = {}) => announcementsRepository.findManyForAdmin(options),
  getForAdmin: (id: AnnouncementId) => announcementsRepository.findById(id),
  createForAdmin: async (authorId: string, input: unknown) => { const data = inputSchema.parse(input); return announcementsRepository.create({ ...data, author_id: authorId, published_at: data.is_published ? new Date().toISOString() : null }); },
  updateForAdmin: async (id: AnnouncementId, input: unknown) => { const current = await announcementsRepository.findById(id); if (!current) throw new Error("找不到公告"); const data = inputSchema.parse(input); return announcementsRepository.updateById(id, { ...data, published_at: data.is_published && !current.is_published ? new Date().toISOString() : data.is_published ? current.published_at : null }); },
  deleteForAdmin: (id: AnnouncementId) => announcementsRepository.deleteById(id),
};
