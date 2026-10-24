import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("admin breadcrumbs expose semantic parent navigation", async () => {
  const source = await readSource("src/components/Breadcrumbs.tsx");
  assert.match(source, /<nav aria-label=\{".*\\u9eb5/);
  assert.match(source, /<Link href=\{item\.href\}/);
  assert.match(source, /aria-current=\{isCurrent \? "page" : undefined\}/);
  assert.match(source, /font-medium text-\(--text-primary\)/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /title=\{item\.label\}/);
  assert.match(source, /truncate/);
  assert.match(source, /shrink-0/);
});

test("user detail uses returnTo in breadcrumbs instead of a duplicate return action", async () => {
  const source = await readSource("src/app/(admin)/admin/users/[id]/page.tsx");
  assert.match(source, /<AdminBreadcrumbs/);
  assert.match(source, /\{ href: returnTo, label:/);
  assert.doesNotMatch(source, /<ButtonLink href=\{returnTo\}/);
});

test("admin detail breadcrumbs preserve existing safe return paths and actions", async () => {
  const [boardGameEdit, eventDetail] = await Promise.all([
    readSource("src/app/(admin)/admin/board-games/[id]/edit/page.tsx"),
    readSource("src/app/(admin)/admin/events/[id]/page.tsx"),
  ]);
  assert.match(boardGameEdit, /getAdminReturnPath/);
  assert.match(boardGameEdit, /<AdminBreadcrumbs/);
  assert.match(boardGameEdit, /查看公開頁面/);
  assert.doesNotMatch(boardGameEdit, /<ButtonLink href=\{returnTo\} variant="outline">/);
  assert.match(eventDetail, /getAdminReturnPath/);
  assert.match(eventDetail, /<AdminBreadcrumbs/);
  assert.match(eventDetail, /<AttendanceActions/);
  assert.doesNotMatch(eventDetail, /href=\{returnTo\}[^>]*>返回活動管理/);
});

test("public board game breadcrumbs preserve the normalized return path", async () => {
  const source = await readSource("src/app/(public)/board-games/[id]/page.tsx");
  assert.match(source, /normalizeBoardGameReturnTo/);
  assert.match(source, /href: returnTo, label:/);
  assert.match(source, /returnTo:/);
});

test("ranking and authenticated settings pages expose their real parent hierarchy", async () => {
  const sources = await Promise.all([
    readSource("src/app/(public)/rankings/page.tsx"),
    readSource("src/app/(public)/rankings/board-games/page.tsx"),
    readSource("src/app/(public)/rankings/reviews/page.tsx"),
    readSource("src/app/(public)/rankings/contributors/page.tsx"),
    readSource("src/app/(authenticated)/settings/layout.tsx"),
    readSource("src/components/(authenticated)/settings/SettingsBreadcrumbs.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/app/(authenticated)/board-games/suggest/page.tsx"),
    readSource("src/app/(authenticated)/memberships/page.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /<Breadcrumbs|SettingsBreadcrumbs/);
    if (!source.includes("SettingsBreadcrumbs")) {
      assert.match(source, /href: \"\/dashboard\"|href: \"\/rankings\"|href: \"\/\"|href: \"\/settings\"/);
    }
  }
});
