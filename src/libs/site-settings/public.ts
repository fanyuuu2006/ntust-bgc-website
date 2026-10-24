import "server-only";

import { cachePublicData } from "@/libs/cache/public-data";
import { siteSettingsService } from "@/services/site-settings/site-settings.service";

/**
 * 讀取公開網站設定。相同設定由各個 Server Component 共用快取，避免 Layout、
 * Metadata 與首頁各自查詢資料庫；資料表暫時不可用時仍由 service 安全回退。
 */
export const getPublicSiteSettings = cachePublicData("siteSettings", () => siteSettingsService.getPublic());
