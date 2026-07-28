import { siteConfigs } from "@/libs/siteConfigs";
import { Metadata } from "next";

const title = ` 儀表板 | ${siteConfigs.title}`;

export const metadata: Metadata = {
  title: {
    default: title,
    template: `%s | ${title}`,
  },
  description: "查看您的帳號資訊與功能入口",
};
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
