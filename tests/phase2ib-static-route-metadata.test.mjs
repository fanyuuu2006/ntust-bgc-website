import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");
const metadataSource = (source) => source.slice(0, source.indexOf("export default"));

test("public static routes own concise titles, descriptions, and relative canonicals", async () => {
  const [home, announcements, boardGames, privacy, terms] = await Promise.all([
    readSource("src/app/(public)/page.tsx"),
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(public)/board-games/page.tsx"),
    readSource("src/app/(public)/privacy/layout.tsx"),
    readSource("src/app/(public)/terms/layout.tsx"),
  ]);

  const expected = [
    [home, undefined, undefined, "/"],
    [announcements, "社團公告", "查看臺科大桌遊社最新社團公告與活動消息。", "/announcements"],
    [boardGames, "桌遊", "探索臺科大桌遊社的桌遊，查看分類、位置與借用資訊。", "/board-games"],
    [privacy, "隱私權政策", undefined, "/privacy"],
    [terms, "服務條款", undefined, "/terms"],
  ];

  for (const [source, title, description, canonical] of expected) {
    const metadata = metadataSource(source);
    assert.match(
      metadata,
      /export const metadata:\s*Metadata|satisfies Metadata/,
    );
    if (title) assert.match(metadata, new RegExp(`title:\\s*"${title}"`));
    if (description) {
      assert.ok(metadata.includes(`description: "${description}"`));
    }
    assert.match(
      metadata,
      new RegExp(`alternates:\\s*\\{[\\s\\S]*?canonical:\\s*"${canonical.replaceAll("/", "\\/")}"`),
    );
    assert.doesNotMatch(metadata, /https:\/\//);
  }
});

test("auth pages own account-accurate browser metadata without canonical URLs", async () => {
  const [login, register, authLayout] = await Promise.all([
    readSource("src/app/(auth)/login/page.tsx"),
    readSource("src/app/(auth)/register/page.tsx"),
    readSource("src/app/(auth)/layout.tsx"),
  ]);

  const loginMetadata = metadataSource(login);
  const registerMetadata = metadataSource(register);

  assert.match(loginMetadata, /title:\s*"登入"/);
  assert.match(loginMetadata, /description:\s*"登入臺科大桌遊社網站帳號。"/);
  assert.match(registerMetadata, /title:\s*"建立網站帳號"/);
  assert.match(registerMetadata, /description:\s*"建立臺科大桌遊社網站帳號。"/);
  assert.doesNotMatch(registerMetadata, /社員註冊|加入社員|入社/);

  for (const metadata of [loginMetadata, registerMetadata]) {
    assert.doesNotMatch(metadata, /alternates\s*:|canonical\s*:/);
  }
  assert.match(authLayout, /robots:\s*\{[\s\S]*?index:\s*false,[\s\S]*?follow:\s*true/);
});

test("every current authenticated route has a user-independent browser title", async () => {
  const [dashboard, borrowings, memberships, profile, settings, authenticatedLayout] =
    await Promise.all([
      readSource("src/app/(authenticated)/dashboard/layout.tsx"),
      readSource("src/app/(authenticated)/borrowings/page.tsx"),
      readSource("src/app/(authenticated)/memberships/page.tsx"),
      readSource("src/app/(authenticated)/profile/layout.tsx"),
      readSource("src/app/(authenticated)/settings/layout.tsx"),
      readSource("src/app/(authenticated)/layout.tsx"),
    ]);

  for (const [source, title] of [
    [dashboard, "儀表板"],
    [borrowings, "我的借用"],
    [memberships, "社員資格"],
    [profile, "個人檔案"],
    [settings, "設定"],
  ]) {
    const metadata = metadataSource(source);
    assert.match(metadata, new RegExp(`title:\\s*"${title}"`));
    assert.doesNotMatch(metadata, /alternates\s*:|canonical\s*:/);
  }

  assert.doesNotMatch(metadataSource(borrowings), /借閱/);
  assert.match(authenticatedLayout, /robots:\s*\{[\s\S]*?index:\s*false,[\s\S]*?follow:\s*false/);
});

test("canonical ownership remains public-page only", async () => {
  const [rootMetadata, authLayout, authenticatedLayout, adminLayout] = await Promise.all([
    readSource("src/libs/metadata.tsx"),
    readSource("src/app/(auth)/layout.tsx"),
    readSource("src/app/(authenticated)/layout.tsx"),
    readSource("src/app/(admin)/admin/layout.tsx"),
  ]);

  for (const source of [rootMetadata, authLayout, authenticatedLayout, adminLayout]) {
    assert.doesNotMatch(source, /alternates\s*:|canonical\s*:/);
  }
  assert.doesNotMatch(rootMetadata, /openGraph\s*:|twitter\s*:/);
});
