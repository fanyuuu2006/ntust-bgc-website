import type { LucideIcon } from "lucide-react";
import { ContactRound, Home, Image, Search } from "lucide-react";

export type SiteSettingsCategory = "branding" | "homepage" | "contact" | "seo";
export type SiteSettingsNavigationItem = { id: SiteSettingsCategory; label: string; description: string; href: string; icon: LucideIcon };

export const siteSettingsNavigation: readonly SiteSettingsNavigationItem[] = [
  { id: "branding", label: "品牌識別", description: "網站名稱、社團正式名稱、Logo 與網站圖示", href: "/admin/site-settings/branding", icon: Image },
  { id: "homepage", label: "首頁內容", description: "首頁主標題、介紹與主視覺圖片", href: "/admin/site-settings/homepage", icon: Home },
  { id: "contact", label: "聯絡與社群", description: "公開聯絡信箱與社團官方社群連結", href: "/admin/site-settings/contact", icon: ContactRound },
  { id: "seo", label: "搜尋與分享", description: "全站預設搜尋資訊與社群分享圖片", href: "/admin/site-settings/seo", icon: Search },
] as const;
