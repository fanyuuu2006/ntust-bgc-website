import { withServerErrorReference } from "@/libs/observability/server-render";
import { GOOGLE_ANALYTICS_ID, isProductionDeployment } from "@/libs/seo";
import { GoogleAnalytics } from "@next/third-parties/google";
export { metadata } from "@/libs/metadata";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning={true}>{children}</body>
      {isProductionDeployment() ? (
        <GoogleAnalytics gaId={GOOGLE_ANALYTICS_ID} />
      ) : null}
    </html>
  );
}

export default withServerErrorReference(RootLayout, "/");
