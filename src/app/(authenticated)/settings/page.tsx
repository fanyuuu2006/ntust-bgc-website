import type { Metadata } from "next";

import { SettingsCategoryList } from "@/components/(authenticated)/settings/SettingsCategoryList";

export const metadata: Metadata = {
  title: "設定",
  description: "管理個人資料、外觀偏好、登入安全與帳號。",
};

export default function SettingsPage() {
  return <SettingsCategoryList />;
}
