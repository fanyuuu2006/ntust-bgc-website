/** 媒體路由只允許這些已確認為公開的 Storage Bucket。 */
export const PUBLIC_MEDIA_BUCKETS = [
  "rich-content-images",
  "board-game-images",
  "avatars",
] as const;

export type PublicMediaBucket = (typeof PUBLIC_MEDIA_BUCKETS)[number];

export type StorageMediaReference = {
  kind: "supabase-storage";
  bucket: PublicMediaBucket;
  objectPath: string;
};

export type MediaSource =
  | StorageMediaReference
  | { kind: "legacy-supabase-url"; reference: StorageMediaReference; url: string }
  | { kind: "site-media-url"; reference: StorageMediaReference; url: string }
  | { kind: "external-url"; url: string }
  | { kind: "invalid" };

export function isPublicMediaBucket(value: string): value is PublicMediaBucket {
  return (PUBLIC_MEDIA_BUCKETS as readonly string[]).includes(value);
}
