export { metadata } from "@/libs/metadata";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { getCurrentUser } from "@/libs/auth";
import { UserProvider } from "@/contexts/UserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  return (
    <html
      lang="zh-Hant"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning={true}>
        <UserProvider user={user}>{children}</UserProvider>
      </body>
    </html>
  );
}
