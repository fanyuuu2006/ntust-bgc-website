import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";

globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const require = createRequire(import.meta.url);
const nextCache = require("next/cache");
const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");

/** 使用真正的 Next unstable_cache／revalidateTag；僅將持久儲存替換為隔離記憶體。 */
export function createPublicCacheRuntime() {
  const entries = new Map();
  const invalidations = [];
  const incrementalCache = {
    generateSimpleCacheKey: async (key) => key,
    get: async (key) => entries.get(key) ?? null,
    set: async (key, value, options) => {
      entries.set(key, { value, isStale: false, tags: options.tags });
    },
  };
  async function run(fn) {
    const store = { incrementalCache, route: "/test", nextFetchId: 1 };
    return workAsyncStorage.run(store, async () => {
      try {
        return await fn();
      } finally {
        await Promise.all(Object.values(store.pendingRevalidates ?? {}));
        for (const item of store.pendingRevalidatedTags ?? []) {
          invalidations.push(item);
          for (const [key, entry] of entries) {
            if (entry.tags.includes(item.tag)) entries.delete(key);
          }
        }
      }
    });
  }
  return {
    run, entries, invalidations,
    clear: () => entries.clear(),
    module: {
      unstable_cache: (...args) => {
        const read = nextCache.unstable_cache(...args);
        return (...values) => run(() => read(...values));
      },
      // 舊有純 Service 測試可同步呼叫；仍由真正 Next API 建立失效指令。
      revalidateTag: (...args) => {
        const store = { incrementalCache, route: "/test" };
        workAsyncStorage.run(store, () => nextCache.revalidateTag(...args));
        for (const item of store.pendingRevalidatedTags ?? []) {
          invalidations.push(item);
          for (const [key, entry] of entries) {
            if (entry.tags.includes(item.tag)) entries.delete(key);
          }
        }
      },
    },
  };
}
