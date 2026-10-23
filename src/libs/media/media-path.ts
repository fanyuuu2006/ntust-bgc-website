import { isPublicMediaBucket, type PublicMediaBucket } from "./media-types";

/**
 * Storage object path 只接受已解碼、相對於 Bucket 的路徑；不接受 URL、反斜線或 traversal。
 */
export function isSafeMediaObjectPath(value: string): boolean {
  if (!value || value.length > 1_024 || value.startsWith("/") || value.includes("\\")) {
    return false;
  }

  if (/[%\u0000-\u001f\u007f]/u.test(value)) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

export function createStorageMediaReference(
  bucket: string,
  objectPath: string,
): { kind: "supabase-storage"; bucket: PublicMediaBucket; objectPath: string } | null {
  if (!isPublicMediaBucket(bucket) || !isSafeMediaObjectPath(objectPath)) return null;
  return { kind: "supabase-storage", bucket, objectPath };
}
