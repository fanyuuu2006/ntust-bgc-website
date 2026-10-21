import type { LucideIcon } from "lucide-react";
import { CircleUserRound, Palette, ShieldCheck, UserRoundCog } from "lucide-react";

export type SettingsNavigationItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const settingsNavigation: readonly SettingsNavigationItem[] = [
  { label: "個人資料", href: "/settings/profile", description: "頭像、顯示名稱與基本資料", icon: CircleUserRound },
  { label: "外觀與偏好", href: "/settings/appearance", description: "淺色、深色或跟隨系統", icon: Palette },
  { label: "安全性", href: "/settings/security", description: "密碼與登入工作階段", icon: ShieldCheck },
  { label: "帳號管理", href: "/settings/account", description: "登入 Email 與帳號註銷", icon: UserRoundCog },
] as const;
