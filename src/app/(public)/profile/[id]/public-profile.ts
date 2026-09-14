import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { publicIdentityService } from "@/services/users/public-identity.service";

// 僅在同次 render 共用 metadata／頁面讀取，不建立會保留舊身份的跨請求快取。
export const getPublicProfile = cache(async (id: string) => {
  const identity = await publicIdentityService.findProfileById(id);
  if (!identity) notFound();
  return identity;
});
