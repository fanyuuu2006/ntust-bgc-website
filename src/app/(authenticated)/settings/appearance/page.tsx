import type { Metadata } from "next";
import { Palette } from "lucide-react";
import { SettingsCard } from "@/components/(authenticated)/settings/SettingsCard";
import { ThemeSelector } from "@/components/theme/ThemeSelector";

export const metadata: Metadata = { title: "外觀與偏好｜設定", description: "選擇網站的顯示主題。" };

export default function AppearanceSettingsPage() {
  return <SettingsCard title="外觀與偏好" icon={<Palette aria-hidden="true" className="size-5" />}><ThemeSelector /></SettingsCard>;
}
