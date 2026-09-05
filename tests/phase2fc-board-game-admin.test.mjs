import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("board-game administration uses an explicit create action and URL-backed query controls", async () => {
  const [page, query] = await Promise.all([
    readSource("src/app/(admin)/admin/board-games/page.tsx"),
    readSource("src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx"),
  ]);

  assert.match(page, /title="桌遊管理"/);
  assert.match(page, /新增桌遊/);
  assert.match(page, /import \{ Plus \} from "lucide-react"/);
  assert.match(query, /搜尋桌遊名稱、社產編號或描述/);
  assert.match(query, /<form method="GET" action=\{BASE_PATH\}>/);
  assert.match(query, /name="page" value="1"/);
  assert.match(query, /name="pageSize"/);
  assert.doesNotMatch(query, /router\.push|preventDefault/);
  assert.match(query, /status/);
  assert.match(query, /category/);
  assert.match(query, /location/);
});

test("board-game records preserve strong entity identity on desktop and mobile", async () => {
  const table = await readSource("src/components/(admin)/admin/board-games/BoardGameTable.tsx");

  assert.match(table, /社產編號/);
  assert.match(table, /BoardGameStatusBadge/);
  assert.match(table, /AdminListSection/);
  assert.match(table, /<Card/);
  assert.match(table, /BoardGameRowActions/);
  assert.match(table, /variant="outline"/);
  assert.doesNotMatch(table, /館藏|借閱/);
});

test("create and edit share one canonical form hierarchy", async () => {
  const [form, createPage, editPage] = await Promise.all([
    readSource("src/components/(admin)/admin/board-games/BoardGameForm.tsx"),
    readSource("src/app/(admin)/admin/board-games/new/page.tsx"),
    readSource("src/app/(admin)/admin/board-games/[id]/edit/page.tsx"),
  ]);

  assert.match(form, /import \{ Card \}/);
  assert.match(form, /基本資料/);
  assert.match(form, /種類與位置/);
  assert.match(form, /介紹與圖片/);
  assert.match(form, /儲存變更/);
  assert.doesNotMatch(form, /className="card/);
  assert.match(createPage, /max-w-3xl/);
  assert.match(editPage, /max-w-3xl/);
});

test("categories and locations expose usage counts before destructive deletion without per-row requests", async () => {
  const [categories, locations, categoryPage, locationPage] = await Promise.all([
    readSource("src/components/(admin)/admin/board-games/categories/CategoryRecords.tsx"),
    readSource("src/components/(admin)/admin/board-games/locations/LocationRecords.tsx"),
    readSource("src/app/(admin)/admin/board-games/categories/page.tsx"),
    readSource("src/app/(admin)/admin/board-games/locations/page.tsx"),
  ]);

  for (const source of [categories, locations]) {
    assert.match(source, /count > 0/);
    assert.match(source, /無法刪除/);
    assert.match(source, /使用中的桌遊/);
    assert.match(source, /ConfirmDialog/);
  }

  assert.match(categoryPage, /countBoardGamesByCategoryIds/);
  assert.match(locationPage, /countBoardGamesByLocationIds/);
  assert.doesNotMatch(categoryPage, /Promise\.all\(/);
  assert.doesNotMatch(locationPage, /Promise\.all\(/);
});
