import "server-only";

import { announcementsRepository, type FindPublishedAnnouncementsOptions } from "@/repositories/announcements.repository";
import { z } from "zod";
const inputSchema = z.object({ title: z.string().trim().min(1).max(160), content: z.string().trim().min(1).max(20000), is_published: z.boolean() });

export const announcementsService = {
  listPublished: (options: FindPublishedAnnouncementsOptions = {}) => announcementsRepository.findPublished(options),
  getPublishedById: (id: string) => announcementsRepository.findPublishedById(id),
  listForAdmin: (options: FindPublishedAnnouncementsOptions & { published?: boolean } = {}) => announcementsRepository.findManyForAdmin(options),
  getForAdmin: (id: string) => announcementsRepository.findById(id),
  createForAdmin: async (authorId: string, input: unknown) => { const data = inputSchema.parse(input); return announcementsRepository.create({ ...data, author_id: authorId, published_at: data.is_published ? new Date().toISOString() : null }); },
  updateForAdmin: async (id: string, input: unknown) => { const current = await announcementsRepository.findById(id); if (!current) throw new Error("找不到公告"); const data = inputSchema.parse(input); return announcementsRepository.updateById(id, { ...data, published_at: data.is_published && !current.is_published ? new Date().toISOString() : data.is_published ? current.published_at : null }); },
  deleteForAdmin: (id: string) => announcementsRepository.deleteById(id),
};
