import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const id = "00000000-0000-4000-8000-000000000001";

test("root metadata owns title grammar, social defaults and public Google verification", () => {
  const { metadata } = load("src/libs/metadata.tsx", {
    "./siteConfigs": {
      siteConfigs: {
        name: "臺科大桌遊社",
        fullName: "國立臺灣科技大學桌上遊戲研究社",
        description: "官方網站",
        icon: "/icon.ico",
        url: "https://ntust-bgc.vercel.app",
      },
    },
    "./seo": {
      DEFAULT_SOCIAL_IMAGE: "/social.jpg",
      GOOGLE_SITE_VERIFICATION: "public-verification",
      isProductionDeployment: () => true,
    },
  });

  assert.equal(metadata.title.template, "%s｜臺科大桌遊社");
  assert.equal(metadata.title.default, "臺科大桌遊社｜國立臺灣科技大學桌上遊戲研究社");
  assert.equal(metadata.verification.google, "public-verification");
  assert.equal(metadata.openGraph.siteName, "臺科大桌遊社");
  assert.equal(metadata.twitter.card, "summary_large_image");
});

test("deployment policy isolates Preview and Local from Production analytics and indexing", () => {
  const { isProductionDeployment } = load("src/libs/seo.ts", {
    "./siteConfigs": { siteConfigs: { name: "site", fullName: "full" } },
  });
  assert.equal(isProductionDeployment("production", "production"), true);
  assert.equal(isProductionDeployment("preview", "production"), false);
  assert.equal(isProductionDeployment("development", "production"), false);
  assert.equal(isProductionDeployment(undefined, "development"), false);
  assert.equal(isProductionDeployment(undefined, "production"), true);
});

test("root layout has exactly one official, Production-only GA4 integration", async () => {
  const layout = await readSource("src/app/layout.tsx");
  assert.match(layout, /@next\/third-parties\/google/);
  assert.match(layout, /isProductionDeployment\(\)/);
  assert.match(layout, /<GoogleAnalytics gaId=\{GOOGLE_ANALYTICS_ID\}/);
  assert.equal((layout.match(/<GoogleAnalytics/g) ?? []).length, 1);
  assert.doesNotMatch(layout, /googletagmanager\.com\/gtag|gtag\(/);
});

test("public Profile metadata uses only public identity and noindexes closure or query variants", async () => {
  const privateValues = ["private@example.test", "真實姓名", "B12345678"];
  const page = load("src/app/(public)/profile/[id]/page.tsx", {
    "./public-profile": {
      getPublicProfile: async () => ({
        identity: { id, name: "公開名稱", avatar: null },
        identityBadges: [],
        clubFootprint: { totalBorrowedCount: 1, attendedCount: 2, joinedAcademicYear: "115" },
        privateValues,
      }),
    },
    "@/services/reviews/reviews.service": { reviewsService: {} },
  });
  const base = await page.generateMetadata({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({}),
  });
  assert.equal(base.title, "公開名稱");
  assert.equal(base.alternates.canonical, `/profile/${id}`);
  assert.equal(base.robots, undefined);
  for (const value of privateValues) assert.doesNotMatch(JSON.stringify(base), new RegExp(value));

  const queried = await page.generateMetadata({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({ reviewSearch: "策略" }),
  });
  assert.deepEqual(queried.robots, { index: false, follow: true });
});

test("closed Profile metadata is a public tombstone and never reconstructs identity", async () => {
  const page = load("src/app/(public)/profile/[id]/page.tsx", {
    "./public-profile": {
      getPublicProfile: async () => ({
        identity: { id, name: "已註銷使用者", avatar: null },
        identityBadges: [],
        clubFootprint: null,
      }),
    },
    "@/services/reviews/reviews.service": { reviewsService: {} },
  });
  const metadata = await page.generateMetadata({
    params: Promise.resolve({ id }),
    searchParams: Promise.resolve({}),
  });
  assert.equal(metadata.title, "已註銷使用者");
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.doesNotMatch(JSON.stringify(metadata), /email|real_name|student_id/);
});

test("entity metadata uses canonical public reads and safe social descriptions", async () => {
  const [boardGamePage, announcementPage] = await Promise.all([
    readSource("src/app/(public)/board-games/[id]/page.tsx"),
    readSource("src/app/(public)/announcements/[id]/page.tsx"),
  ]);
  assert.match(boardGamePage, /createPublicMetadata/);
  assert.match(boardGamePage, /getSafeMetadataImageUrl/);
  assert.match(boardGamePage, /"@type": "Game"/);
  assert.match(announcementPage, /plainTextFromStoredContent/);
  assert.match(announcementPage, /"@type": "Article"/);
  assert.doesNotMatch(announcementPage, /NewsArticle/);
});

test("structured data escapes markup-breaking content", () => {
  const { StructuredData } = load("src/components/StructuredData.tsx");
  const html = renderToStaticMarkup(
    createElement(StructuredData, { data: { name: "</script><script>alert(1)</script>" } }),
  );
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /\\u003c\/script>/);
});

test("robots allows canonical public crawling only in Production", () => {
  const production = load("src/app/robots.ts", {
    "@/libs/seo": { isProductionDeployment: () => true },
    "@/libs/siteConfigs": { siteConfigs: { url: "https://ntust-bgc.vercel.app" } },
  }).default();
  assert.equal(production.rules.allow, "/");
  assert.equal(production.rules.disallow, "/api/");
  assert.equal(production.sitemap, "https://ntust-bgc.vercel.app/sitemap.xml");

  const preview = load("src/app/robots.ts", {
    "@/libs/seo": { isProductionDeployment: () => false },
    "@/libs/siteConfigs": { siteConfigs: { url: "https://preview.example" } },
  }).default();
  assert.equal(preview.rules.disallow, "/");
  assert.equal(preview.sitemap, undefined);
});

test("sitemap contains canonical public entities and excludes private route families", async () => {
  const sitemap = load("src/app/sitemap.ts", {
    "@/libs/seo": { isProductionDeployment: () => true },
    "@/libs/siteConfigs": { siteConfigs: { url: "https://ntust-bgc.vercel.app" } },
    "@/repositories/seo.repository": {
      seoRepository: {
        listPublicSitemapEntities: async () => ({
          announcements: [{ id: 1, updated_at: "2026-09-01T00:00:00Z" }],
          boardGames: [{ id, updated_at: "2026-09-02T00:00:00Z" }],
          profiles: [{ id, updated_at: "2026-09-03T00:00:00Z" }],
        }),
      },
    },
  });
  const entries = await sitemap.default();
  const urls = entries.map((entry) => entry.url);
  assert.ok(urls.includes("https://ntust-bgc.vercel.app/"));
  assert.ok(urls.includes("https://ntust-bgc.vercel.app/announcements/1"));
  assert.ok(urls.includes(`https://ntust-bgc.vercel.app/board-games/${id}`));
  assert.ok(urls.includes(`https://ntust-bgc.vercel.app/profile/${id}`));
  assert.ok(urls.every((url) => !/\/admin|\/api|\/login|\/dashboard|\/settings/.test(url)));
});

test("private route families retain explicit noindex policies", async () => {
  const sources = await Promise.all([
    readSource("src/app/(auth)/layout.tsx"),
    readSource("src/app/(authenticated)/layout.tsx"),
    readSource("src/app/(admin)/admin/layout.tsx"),
    readSource("src/app/(public)/verify-email/page.tsx"),
  ]);
  for (const source of sources) assert.match(source, /index:\s*false/);
});

test("privacy policy accurately discloses Production-only Google Analytics", async () => {
  const privacy = await readSource("src/app/(public)/privacy/page.tsx");
  assert.match(privacy, /Google Analytics 4/);
  assert.match(privacy, /Local 與 Preview 環境不載入/);
  assert.doesNotMatch(privacy, /未整合廣告追蹤或 Google Analytics/);
});
