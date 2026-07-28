import { Metadata } from "next";

export const metadata: Metadata = {
  title: "設定",
  description: "管理您的帳號、個人資料與安全性設定",
};
export default function DashboardSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
