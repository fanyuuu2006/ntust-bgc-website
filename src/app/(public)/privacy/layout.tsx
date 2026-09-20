import type { Metadata } from "next";
import { createPublicMetadata } from "@/libs/seo";

export const metadata: Metadata = createPublicMetadata({
  title: "隱私權政策",
  description:
    "國立臺灣科技大學桌上遊戲研究社官方網站隱私權政策，說明帳號、社員、借用與活動資料、登入 Cookie、第三方服務及個資權利。",
  canonical: "/privacy",
});
export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
