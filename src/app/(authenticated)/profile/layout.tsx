import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "個人檔案",
};

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
