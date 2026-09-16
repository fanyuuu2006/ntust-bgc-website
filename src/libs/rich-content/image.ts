export const RICH_CONTENT_IMAGE_BUCKET = "rich-content-images";
export const RICH_CONTENT_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const RICH_CONTENT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type RichContentImageMimeType =
  (typeof RICH_CONTENT_IMAGE_MIME_TYPES)[number];
export type RichImageNode = {
  type: "image";
  attrs: { src: string; alt: string; caption: string | null };
};

const OBJECT_PATH =
  /^uploads\/(\d{4})\/(0[1-9]|1[0-2])\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)$/u;

export function normalizeSupabaseOrigin(
  configured: string | undefined,
  requireHttps = true,
): string | null {
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return (!requireHttps || url.protocol === "https:") &&
      ["http:", "https:"].includes(url.protocol) && url.pathname === "/" &&
      !url.username && !url.password && !url.search && !url.hash
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function richContentImageOriginsMatch(
  serverOrigin: string | undefined,
  publicOrigin: string | undefined,
): boolean {
  const server = normalizeSupabaseOrigin(serverOrigin);
  const client = normalizeSupabaseOrigin(publicOrigin);
  return server !== null && client !== null && server === client;
}

function configuredSupabaseOrigin(): string | null {
  return normalizeSupabaseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function isRichContentImageObjectPath(value: string): boolean {
  return OBJECT_PATH.test(value);
}

export function createRichContentImageObjectPath(
  extension: "jpg" | "png" | "webp",
  now = new Date(),
  randomId = crypto.randomUUID(),
): string {
  const year = String(now.getUTCFullYear()).padStart(4, "0");
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const path = `uploads/${year}/${month}/${randomId}.${extension}`;
  if (!isRichContentImageObjectPath(path)) {
    throw new Error("無法建立安全的圖片物件路徑");
  }
  return path;
}

export function buildRichContentImagePublicUrl(
  objectPath: string,
  configuredOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string {
  const origin = normalizeSupabaseOrigin(configuredOrigin);
  if (!origin || !isRichContentImageObjectPath(objectPath)) {
    throw new Error("Rich Content 圖片 Storage 設定無效");
  }
  return `${origin}/storage/v1/object/public/${RICH_CONTENT_IMAGE_BUCKET}/${objectPath}`;
}

export function isCanonicalRichContentImageUrl(value: string): boolean {
  if (
    value.length > 2_048 ||
    /[\s\u0000-\u001f\u007f<>"'\\]/u.test(value)
  ) return false;
  const origin = configuredSupabaseOrigin();
  if (!origin) return false;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.origin !== origin ||
      url.username || url.password || url.search || url.hash
    ) return false;
    const prefix = `/storage/v1/object/public/${RICH_CONTENT_IMAGE_BUCKET}/`;
    if (!url.pathname.startsWith(prefix)) return false;
    const objectPath = url.pathname.slice(prefix.length);
    return isRichContentImageObjectPath(objectPath) &&
      value === buildRichContentImagePublicUrl(objectPath);
  } catch {
    return false;
  }
}

const unicodeLength = (value: string) => Array.from(value).length;

/** 驗證並正規化持久化 image node；空 alt 明確代表裝飾圖片。 */
export function normalizeRichImageNode(value: unknown): RichImageNode | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const node = value as Record<string, unknown>;
  if (
    node.type !== "image" ||
    Object.keys(node).some((key) => !["type", "attrs"].includes(key)) ||
    !node.attrs || typeof node.attrs !== "object" || Array.isArray(node.attrs)
  ) return null;
  const attrs = node.attrs as Record<string, unknown>;
  if (
    Object.keys(attrs).length !== 3 ||
    Object.keys(attrs).some((key) => !["src", "alt", "caption"].includes(key)) ||
    typeof attrs.src !== "string" ||
    typeof attrs.alt !== "string" ||
    (attrs.caption !== null && typeof attrs.caption !== "string") ||
    !isCanonicalRichContentImageUrl(attrs.src)
  ) return null;

  const alt = attrs.alt === "" ? "" : attrs.alt.trim();
  if (attrs.alt !== "" && !alt) return null;
  const caption = typeof attrs.caption === "string"
    ? attrs.caption.trim() || null
    : null;
  if (unicodeLength(alt) > 300 || (caption && unicodeLength(caption) > 500)) {
    return null;
  }
  return { type: "image", attrs: { src: attrs.src, alt, caption } };
}
