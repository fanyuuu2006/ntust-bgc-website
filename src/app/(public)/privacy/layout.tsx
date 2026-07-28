import { Metadata } from "next";

export const metadata: Metadata = {
  title: "隱私權政策",
  description:
    "國立臺灣科技大學桌上遊戲研究社官方網站隱私權政策，說明個人資料蒐集、使用方式及資料保護措施。",
};
export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
