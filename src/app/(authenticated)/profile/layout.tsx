import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "個人資料",
};

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
