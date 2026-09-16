import { normalizeSupabaseOrigin } from "@/libs/rich-content/image";
import type { SupportedImageExtension } from "@/libs/images/file-signature";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const OBJECT_PATH = new RegExp(`^(${UUID})/(${UUID_V4})\\.(jpg|png|webp)$`, "u");

export function createAvatarObjectPath(
  userId: string,
  extension: SupportedImageExtension,
  randomId = crypto.randomUUID(),
): string {
  const path = `${userId}/${randomId}.${extension}`;
  if (!OBJECT_PATH.test(path)) throw new Error("無法建立安全的頭像物件路徑");
  return path;
}

export function buildAvatarPublicUrl(
  objectPath: string,
  configuredOrigin = process.env.SUPABASE_URL,
): string {
  const origin = normalizeSupabaseOrigin(configuredOrigin);
  if (!origin || !OBJECT_PATH.test(objectPath)) {
    throw new Error("頭像 Storage 設定無效");
  }
  return `${origin}/storage/v1/object/public/${AVATAR_BUCKET}/${objectPath}`;
}

export function parseOwnedAvatarUrl(
  value: string,
  expectedUserId: string,
  configuredOrigin = process.env.SUPABASE_URL,
): { objectPath: string; extension: SupportedImageExtension } | null {
  if (
    value.length > 2_048 ||
    /[\s\u0000-\u001f\u007f<>"'\\]/u.test(value)
  ) return null;
  const origin = normalizeSupabaseOrigin(configuredOrigin);
  if (!origin) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.origin !== origin || url.username ||
      url.password || url.search || url.hash
    ) return null;
    const prefix = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    if (!url.pathname.startsWith(prefix)) return null;
    const objectPath = url.pathname.slice(prefix.length);
    const match = OBJECT_PATH.exec(objectPath);
    if (!match || match[1] !== expectedUserId) return null;
    const extension = match[3] as SupportedImageExtension;
    return value === buildAvatarPublicUrl(objectPath, origin)
      ? { objectPath, extension }
      : null;
  } catch {
    return null;
  }
}
