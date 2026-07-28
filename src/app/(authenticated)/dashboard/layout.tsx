import { Metadata } from "next";

export const metadata: Metadata = {
  title: "儀表板",
  description: "查看您的帳號資訊與功能入口",
};
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
