import { Metadata } from "next";

export const metadata: Metadata = {
  title: "個人資料",
};
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
