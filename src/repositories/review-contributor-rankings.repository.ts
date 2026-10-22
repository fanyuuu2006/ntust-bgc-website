import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
import { buildPaginationResult, normalizePaginationOptions } from "@/repositories/shared/pagination";
import { buildIlikePattern } from "@/repositories/shared/search";

export type ReviewContributorRankingSource = {
  global_rank: number | string;
  user_id: string;
  user_name: string;
  review_count: number | string;
  received_like_count: number | string;
  latest_review_at: string;
  user_avatar: string | null;
};

export const reviewContributorRankingsRepository = {
  findPage: async (options: { page?: number; pageSize?: number; search?: string } = {}) => {
    const { page, pageSize, from, to } = normalizePaginationOptions({ ...options, maxPageSize: 50 });
    let query = supabase
      .from("review_contributor_rankings")
      .select("global_rank,user_id,user_name,review_count,received_like_count,latest_review_at,user_avatar", { count: "exact" });
    const search = options.search?.trim();
    if (search) query = query.ilike("user_name", buildIlikePattern(search));
    const { data, error, count } = await query.order("global_rank", { ascending: true }).range(from, to);
    if (error && error.code === "PGRST103") {
      // 空資料或超出最後一頁時 PostgREST 會回 416；補查總數後回傳安全的空頁。
      let countQuery = supabase
        .from("review_contributor_rankings")
        .select("global_rank", { count: "exact", head: true });
      if (search) countQuery = countQuery.ilike("user_name", buildIlikePattern(search));
      const { count: total, error: countError } = await countQuery;
      if (countError) throwRepositoryError("取得公開評論貢獻排行總數失敗", countError);
      return buildPaginationResult([], total, page, pageSize);
    }
    if (error) throwRepositoryError("取得公開評論貢獻排行失敗", error);
    return buildPaginationResult((data ?? []) as ReviewContributorRankingSource[], count, page, pageSize);
  },
};
