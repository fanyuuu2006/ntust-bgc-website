import { normalizeSupabaseOrigin } from "@/libs/rich-content/image";

import {
  createStorageMediaReference,
  isSafeMediaObjectPath,
} from "./media-path";
import type { MediaSource, StorageMediaReference } from "./media-types";

const SITE_MEDIA_PREFIX = "/media/";
const STORAGE_PREFIX = "/storage/v1/object/public/";

function encodeObjectPath(objectPath: string): string {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function parsePath(pathname: string, prefix: string): StorageMediaReference | null {
  if (!pathname.startsWith(prefix)) return null;
  const remainder = pathname.slice(prefix.length);
  const separator = remainder.indexOf("/");
  if (separator <= 0) return null;

  const bucket = remainder.slice(0, separator);
  const encodedPath = remainder.slice(separator + 1);
  let objectPath: string;
  try {
    objectPath = decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
  return createStorageMediaReference(bucket, objectPath);
}

function parseUrl(value: string, base?: string): URL | null {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (url.username || url.password || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

/** 建立不含 Supabase Project 資訊的本站媒體路徑。 */
export function buildSiteMediaUrl(reference: StorageMediaReference): string {
  if (!isSafeMediaObjectPath(reference.objectPath)) {
    throw new Error("Invalid media object path");
  }
  return `${SITE_MEDIA_PREFIX}${reference.bucket}/${encodeObjectPath(reference.objectPath)}`;
}

/** 解析本站 /media URL；回傳 null 代表 URL 不屬於受支援的公開媒體路由。 */
export function parseSiteMediaUrl(value: string): StorageMediaReference | null {
  const url = parseUrl(value, "https://media.invalid");
  if (!url || url.origin !== "https://media.invalid") return null;
  return parsePath(url.pathname, SITE_MEDIA_PREFIX);
}

/** 解析目前環境的 Supabase Public URL，不接受其他 Project 或其他 Host。 */
export function parseSupabasePublicMediaUrl(
  value: string,
  configuredOrigin: string | undefined,
): StorageMediaReference | null {
  const origin = normalizeSupabaseOrigin(configuredOrigin);
  if (!origin) return null;
  const url = parseUrl(value);
  if (!url || url.origin !== origin || url.protocol !== "https:") return null;
  return parsePath(url.pathname, STORAGE_PREFIX);
}

/** 分辨本站媒體、目前環境 legacy Supabase URL、外部 URL 與不合法輸入。 */
export function identifyMediaSource(
  value: string,
  configuredOrigin: string | undefined,
): MediaSource {
  const siteReference = parseSiteMediaUrl(value);
  if (siteReference) return { kind: "site-media-url", reference: siteReference, url: value };

  const supabaseReference = parseSupabasePublicMediaUrl(value, configuredOrigin);
  if (supabaseReference) {
    return { kind: "legacy-supabase-url", reference: supabaseReference, url: value };
  }

  const external = parseUrl(value);
  if (external && (external.protocol === "https:" || external.protocol === "http:")) {
    return { kind: "external-url", url: value };
  }
  return { kind: "invalid" };
}

/**
 * 取得圖片顯示用網址；只轉換目前環境擁有的 Supabase 公開物件。
 * 外部頭像保留原網址，無法安全辨識的值則交由元件顯示 fallback。
 */
export function resolveMediaDisplayUrl(
  value: string | null | undefined,
  configuredOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!value) return null;

  const source = identifyMediaSource(value, configuredOrigin);
  if (source.kind === "site-media-url" || source.kind === "external-url") {
    return source.url;
  }
  if (source.kind === "legacy-supabase-url") {
    return buildSiteMediaUrl(source.reference);
  }
  // 保留既有的本站相對圖片路徑，但不接受 protocol-relative URL。
  if (value.startsWith("/") && !value.startsWith("//") && parseUrl(value, "https://site.invalid")) {
    return value;
  }
  return null;
}
