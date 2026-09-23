import type { MetadataRoute } from "next";

import { isProductionDeployment } from "@/libs/seo";
import { siteConfigs } from "@/libs/siteConfigs";
import { seoRepository } from "@/repositories/seo.repository";

const STATIC_PATHS = [
  "",
  "/announcements",
  "/board-games",
  "/support",
  "/privacy",
  "/terms",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isProductionDeployment()) return [];

  const entities = await seoRepository.listPublicSitemapEntities();
  const absoluteUrl = (path: string) => new URL(path || "/", siteConfigs.url).toString();

  return [
    ...STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) })),
    ...entities.announcements.map((item) => ({
      url: absoluteUrl(`/announcements/${item.id}`),
      lastModified: item.updated_at,
    })),
    ...entities.boardGames.map((item) => ({
      url: absoluteUrl(`/board-games/${item.id}`),
      lastModified: item.updated_at,
    })),
    ...entities.profiles.map((item) => ({
      url: absoluteUrl(`/profile/${item.id}`),
      lastModified: item.updated_at,
    })),
  ];
}
