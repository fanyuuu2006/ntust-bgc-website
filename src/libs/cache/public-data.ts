import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

export const PUBLIC_CACHE = {
  announcements: { tag: "public-home-announcements-v1", ttl: 30 },
  popularGames: { tag: "public-home-games-v1", ttl: 60 },
  categories: { tag: "public-categories-v1", ttl: 300 },
  locations: { tag: "public-locations-v1", ttl: 300 },
} as const;

type PublicCacheKey = keyof typeof PUBLIC_CACHE;

/**
 * 僅供固定的公開資料讀取。時間區段納入 key，過期後不再讀取舊區段，
 * 避免 Next 的背景 revalidation 在上游故障時持續展示已撤回內容。
 * callback 拋出的錯誤不轉成成功值；下一次請求仍可重試並保留 section fallback。
 * 不得傳入 Session、使用者資料或依權限變動的 loader。
 */
export function cachePublicData<T>(key: PublicCacheKey, loader: () => Promise<T>) {
  const { tag, ttl } = PUBLIC_CACHE[key];
  const read = unstable_cache(
    async (timeWindow: number) => {
      // 引數只用於 Next cache key；資料查詢不依賴時間區段值。
      void timeWindow;
      return loader();
    },
    [tag, process.env.SUPABASE_URL ?? "unconfigured"],
    { revalidate: ttl, tags: [tag] },
  );
  return () => read(Math.floor(Date.now() / (ttl * 1000)));
}

/** 寫入成功後立即失效；不用 stale-while-revalidate，讓下架公告不再命中舊資料。 */
export function invalidatePublicData(...keys: PublicCacheKey[]) {
  for (const key of keys) revalidateTag(PUBLIC_CACHE[key].tag, { expire: 0 });
}
