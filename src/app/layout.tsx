import { withServerErrorReference } from "@/libs/observability/server-render";
import { GOOGLE_ANALYTICS_ID, isProductionDeployment } from "@/libs/seo";
import type { Metadata } from "next";
import { createRootMetadata } from "@/libs/metadata";
import { getPublicSiteSettings } from "@/libs/site-settings/public";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { THEME_INITIALIZATION_SCRIPT } from "@/libs/theme";
import "@/styles/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return createRootMetadata(await getPublicSiteSettings());
}

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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head />
      <body>
        <Script id="theme-initialization" strategy="beforeInteractive">
          {THEME_INITIALIZATION_SCRIPT}
        </Script>
        <ThemeProvider><ToastProvider>{children}</ToastProvider></ThemeProvider>
      </body>
      {isProductionDeployment() ? (
        <GoogleAnalytics gaId={GOOGLE_ANALYTICS_ID} />
      ) : null}
    </html>
  );
}

export default withServerErrorReference(RootLayout, "/");
