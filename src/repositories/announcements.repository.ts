import "server-only";

import { supabase } from "@/libs/supabase/server";
import { isPostgrestRangeNotSatisfiable } from "@/repositories/shared/postgrest";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { buildPaginationResult, normalizePaginationOptions } from "@/repositories/shared/pagination";
import type { PaginationQuery } from "@/repositories/shared/types";
import type { Announcement, AnnouncementId } from "@/types/database";

export const ANNOUNCEMENT_SORT_FIELDS = ["title", "created_at", "updated_at", "published_at"] as const;
export type AnnouncementSortField = (typeof ANNOUNCEMENT_SORT_FIELDS)[number];
export type FindPublishedAnnouncementsOptions = PaginationQuery & { search?: string; orderBy?: AnnouncementSortField; orderDirection?: "asc" | "desc" };

export type HomepageAnnouncement = Pick<Announcement, "id" | "title" | "content" | "published_at" | "created_at">;

export const announcementsRepository = {
  /** 首頁使用 Server 衍生的純文字摘要，不載入 Rich Content 文件與作者資料。 */
  findHomepagePreview: async (): Promise<HomepageAnnouncement[]> => {
    const { data, error } = await supabase.from("announcements")
      .select("id,title,content,published_at,created_at")
      .eq("is_published", true).order("published_at", { ascending: false }).limit(3);
    if (error) throwRepositoryError("讀取首頁公告預覽失敗", error);
    return data ?? [];
  },
  findManyForAdmin: async (options: FindPublishedAnnouncementsOptions & { published?: boolean } = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions(options);
    let query = supabase.from("announcements").select("*", { count: "exact" });
    if (options.published !== undefined) query = query.eq("is_published", options.published);
    const search = options.search?.trim();
    if (search) query = query.or(`title.ilike.%${search.replace(/[%,()]/g, "")}%,content.ilike.%${search.replace(/[%,()]/g, "")}%`);
    const { data, error, count } = await query.order(options.orderBy ?? "created_at", { ascending: options.orderDirection === "asc" }).range(from, to);
    if (error) throwRepositoryError("取得管理公告失敗", error);
    return buildPaginationResult<Announcement>(data ?? [], count, page, pageSize);
  },
  findById: async (id: AnnouncementId): Promise<Announcement | null> => { const { data, error } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle(); if (error) throwRepositoryError("取得公告失敗", error); return data; },
  create: async (payload: Pick<Announcement, "title" | "content" | "content_format" | "rich_content" | "author_id" | "is_published" | "published_at">) => { const { data, error } = await supabase.from("announcements").insert(payload).select().single(); if (error) throwRepositoryError("建立公告失敗", error); return data; },
  updateById: async (id: AnnouncementId, payload: Partial<Pick<Announcement, "title" | "content" | "content_format" | "rich_content" | "is_published" | "published_at">>) => { const { data, error } = await supabase.from("announcements").update(payload).eq("id", id).select().maybeSingle(); if (error) throwRepositoryError("更新公告失敗", error); return data; },
  deleteById: async (id: AnnouncementId) => { const { error } = await supabase.from("announcements").delete().eq("id", id); if (error) throwRepositoryError("刪除公告失敗", error); },
  findPublished: async (options: FindPublishedAnnouncementsOptions = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions(options);
    let query = supabase.from("announcements").select("*", { count: "exact" }).eq("is_published", true);
    const search = options.search?.trim();
    if (search) query = query.or(`title.ilike.%${search.replace(/[%,()]/g, "")}%,content.ilike.%${search.replace(/[%,()]/g, "")}%`);
    const { data, error, count } = await query.order("published_at", { ascending: false }).range(from, to);
    if (error) {
      if (!isPostgrestRangeNotSatisfiable(error)) {
        throwRepositoryError("讀取已發布公告失敗", error);
      }

      let countQuery = supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true);
      if (search) {
        const escapedSearch = search.replace(/[%,()]/g, "");
        countQuery = countQuery.or(
          `title.ilike.%${escapedSearch}%,content.ilike.%${escapedSearch}%`,
        );
      }
      const { count: totalCount, error: countError } = await countQuery;
      if (countError) {
        throwRepositoryError("計算已發布公告數量失敗", countError);
      }

      return buildPaginationResult<Announcement>([], totalCount, page, pageSize);
    }
    return buildPaginationResult<Announcement>(data ?? [], count, page, pageSize);
  },
  findPublishedById: async (id: AnnouncementId): Promise<Announcement | null> => {
    const { data, error } = await supabase.from("announcements").select("*").eq("id", id).eq("is_published", true).maybeSingle();
    if (error) throwRepositoryError("讀取公告失敗", error);
    return data;
  },
};
