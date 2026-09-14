import "server-only";
import { z } from "zod";
import { publicIdentitiesRepository } from "@/repositories/public-identities.repository";
import type { PublicUserIdentity } from "@/types/public-user";

function publicAvatar(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? value : null;
  } catch { return null; }
}

export const publicIdentityService = {
  /**
   * 公開頁面／作者資訊的 Server 資料邊界，回傳值只包含三個公開欄位。
   * 明列欄位而非展開來源物件，避免 Repository 日後增加欄位時意外洩漏。
   * 註銷時強制覆蓋名稱與頭像；不依賴來源資料已完成清除，也不輸出註銷時間。
   */
  findById: async (input: unknown): Promise<PublicUserIdentity | null> => {
    const parsed = z.uuid().safeParse(input);
    if (!parsed.success) return null;
    const source = await publicIdentitiesRepository.findById(parsed.data);
    if (!source) return null;
    return {
      id: source.id,
      name: source.closed_at ? "已註銷使用者" : source.name,
      avatar: source.closed_at ? null : publicAvatar(source.avatar),
    };
  },
};
