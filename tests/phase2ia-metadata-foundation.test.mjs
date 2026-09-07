import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("root metadata derives the canonical identity from the shared site configuration", async () => {
  const [environment, metadata, siteConfigs] = await Promise.all([
    readSource("src/libs/env.tsx"),
    readSource("src/libs/metadata.tsx"),
    readSource("src/libs/siteConfigs.tsx"),
  ]);

  assert.match(siteConfigs, /name:\s*"臺科大桌遊社"/);
  assert.match(siteConfigs, /fullName:\s*"國立臺灣科技大學桌上遊戲研究社"/);
  assert.match(environment, /export function getSiteUrl/);
  assert.match(siteConfigs, /get url\(\)[\s\S]*return getSiteUrl\(\)/);
  assert.match(
    siteConfigs,
    /description:\s*"臺科大桌遊社官方網站，查看社團最新消息、探索桌遊與相關資訊。"/,
  );
  assert.match(metadata, /metadataBase:\s*new URL\(siteConfigs\.url\)/);
  assert.match(
    metadata,
    /default:\s*`\$\{siteConfigs\.name\}｜\$\{siteConfigs\.fullName\}`/,
  );
  assert.match(metadata, /template:\s*`%s｜\$\{siteConfigs\.name\}`/);
  assert.match(metadata, /description:\s*siteConfigs\.description/);
  assert.match(metadata, /url:\s*siteConfigs\.icon/);
  assert.doesNotMatch(
    environment + metadata + siteConfigs,
    /https:\/\/ntust-bgc\.vercel\.app/,
  );
});

test("root metadata establishes a base URL without inheriting unfinished SEO policies", async () => {
  const metadata = await readSource("src/libs/metadata.tsx");

  assert.doesNotMatch(metadata, /alternates\s*:|canonical\s*:/);
  assert.doesNotMatch(metadata, /openGraph\s*:|twitter\s*:|robots\s*:/);
});

test("route groups own their distinct crawler indexing boundaries", async () => {
  const [auth, authenticated, admin] = await Promise.all([
    readSource("src/app/(auth)/layout.tsx"),
    readSource("src/app/(authenticated)/layout.tsx"),
    readSource("src/app/(admin)/admin/layout.tsx"),
  ]);

  assert.match(auth, /export const metadata:\s*Metadata\s*=\s*\{[\s\S]*?robots:\s*\{[\s\S]*?index:\s*false,[\s\S]*?follow:\s*true/);
  assert.match(authenticated, /export const metadata:\s*Metadata\s*=\s*\{[\s\S]*?robots:\s*\{[\s\S]*?index:\s*false,[\s\S]*?follow:\s*false/);
  assert.match(admin, /export const metadata:\s*Metadata\s*=\s*\{[\s\S]*?robots:\s*\{[\s\S]*?index:\s*false,[\s\S]*?follow:\s*false/);
});

test("metadata foundations preserve layout guards, shells, language, and child titles", async () => {
  const [rootLayout, auth, authenticated, adminGuard, adminSegment, dashboard, profile, settings, privacy, terms] =
    await Promise.all([
      readSource("src/app/layout.tsx"),
      readSource("src/app/(auth)/layout.tsx"),
      readSource("src/app/(authenticated)/layout.tsx"),
      readSource("src/app/(admin)/layout.tsx"),
      readSource("src/app/(admin)/admin/layout.tsx"),
      readSource("src/app/(authenticated)/dashboard/layout.tsx"),
      readSource("src/app/(authenticated)/profile/layout.tsx"),
      readSource("src/app/(authenticated)/settings/layout.tsx"),
      readSource("src/app/(public)/privacy/layout.tsx"),
      readSource("src/app/(public)/terms/layout.tsx"),
    ]);

  assert.match(rootLayout, /<html[\s\S]*?lang="zh-Hant"/);
  assert.match(auth, /getCurrentUser\(\)[\s\S]*?redirect\("\/dashboard"\)[\s\S]*?<WebsiteShell/);
  assert.match(authenticated, /getCurrentUser\(\)[\s\S]*?redirect\("\/login"\)[\s\S]*?<WebsiteShell/);
  assert.match(adminGuard, /getCurrentUser\(\)/);
  assert.match(adminGuard, /redirect\("\/login"\)/);
  assert.match(adminGuard, /isAdminByUserId\(user\.id\)/);
  assert.match(adminGuard, /redirect\("\/"\)/);
  assert.match(adminGuard, /<AdminShell/);
  assert.match(adminSegment, /return children/);

  for (const [source, title] of [
    [dashboard, "儀表板"],
    [profile, "個人檔案"],
    [settings, "設定"],
    [privacy, "隱私權政策"],
    [terms, "服務條款"],
  ]) {
    assert.match(source, new RegExp(`title:\\s*"${title}"`));
  }
});
