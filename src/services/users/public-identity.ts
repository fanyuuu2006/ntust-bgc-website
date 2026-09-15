import type { PublicUserIdentity } from "@/types/public-user";

export type PublicIdentitySource = PublicUserIdentity & {
  closed_at: string | null;
};

function publicAvatar(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? value
      : null;
  } catch {
    return null;
  }
}
/**
 * 將資料庫的最小使用者欄位轉為公開身份。
 *
 * `closed_at` 僅供此邊界判斷；註銷後固定輸出墓碑名稱與空頭像，且不把生命週期欄位傳給公開 DTO。
 */
export function toPublicUserIdentity(source: PublicIdentitySource): PublicUserIdentity {
  return {
    id: source.id,
    name: source.closed_at ? "已註銷使用者" : source.name,
    avatar: source.closed_at ? null : publicAvatar(source.avatar),
  };
}
