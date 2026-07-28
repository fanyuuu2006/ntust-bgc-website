import { Metadata } from "next";

export const metadata: Metadata = {
  title: "服務條款",
  description:
    "國立臺灣科技大學桌上遊戲研究社官方網站服務條款，說明網站使用規範、帳號管理及使用者權利與義務。",
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
