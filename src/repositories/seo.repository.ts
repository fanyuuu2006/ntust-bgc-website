import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "./shared/errors";

export type SitemapEntity = {
  id: string | number;
  updated_at: string;
};

const SITEMAP_ENTITY_LIMIT = 5_000;

export const seoRepository = {
  listPublicSitemapEntities: async (): Promise<{
    announcements: SitemapEntity[];
    boardGames: SitemapEntity[];
    profiles: SitemapEntity[];
  }> => {
    const [announcementResult, boardGameResult, profileResult] = await Promise.all([
      supabase
        .from("announcements")
        .select("id,updated_at")
        .eq("is_published", true)
        .order("id")
        .limit(SITEMAP_ENTITY_LIMIT),
      supabase
        .from("board_games")
        .select("id,updated_at")
        .order("id")
        .limit(SITEMAP_ENTITY_LIMIT),
      supabase
        .from("users")
        .select("id,updated_at")
        .is("closed_at", null)
        .order("id")
        .limit(SITEMAP_ENTITY_LIMIT),
    ]);

    if (announcementResult.error) {
      throwRepositoryError("取得 Sitemap 公告失敗", announcementResult.error);
    }
    if (boardGameResult.error) {
      throwRepositoryError("取得 Sitemap 桌遊失敗", boardGameResult.error);
    }
    if (profileResult.error) {
      throwRepositoryError("取得 Sitemap 公開個人頁面失敗", profileResult.error);
    }

    return {
      announcements: announcementResult.data ?? [],
      boardGames: boardGameResult.data ?? [],
      profiles: profileResult.data ?? [],
    };
  },
};
