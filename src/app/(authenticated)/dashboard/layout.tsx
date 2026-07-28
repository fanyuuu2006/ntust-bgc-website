import { Metadata } from "next";

export const metadata: Metadata = {
  title: "儀表板",
  description:
    "國立臺灣科技大學桌上遊戲研究社官方網站儀表板，提供登入之會員個人資料、活動報名、桌遊收藏與社團管理功能。",
};
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
