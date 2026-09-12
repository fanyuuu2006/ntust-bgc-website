import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");
const importTypeScriptModule = async (path) => {
  const source = await readSource(path);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

test("metadata copy and content helpers produce concise, safe text", async () => {
  const [siteConfigSource, helpers] = await Promise.all([
    readSource("src/libs/siteConfigs.tsx"),
    importTypeScriptModule("src/libs/metadata-content.ts"),
  ]);

  assert.ok(
    siteConfigSource.includes(
      "臺科大桌遊社官方網站，查看社團最新消息、探索桌遊與相關資訊。",
    ),
  );
  assert.doesNotMatch(siteConfigSource, /社員服務/);

  assert.equal(
    helpers.createMetadataDescription("  第一段\n\n  第二段\t內容  "),
    "第一段 第二段 內容",
  );
  assert.equal(Array.from(helpers.createMetadataTitle("🎲".repeat(80))).length, 60);
  assert.match(helpers.createMetadataTitle("🎲".repeat(80)), /…$/);
  assert.equal(Array.from(helpers.createMetadataDescription("字".repeat(200))).length, 160);
  assert.match(helpers.createMetadataDescription("字".repeat(200)), /…$/);

  assert.equal(helpers.getSafeMetadataImageUrl("https://example.com/game.jpg"), "https://example.com/game.jpg");
  assert.equal(helpers.getSafeMetadataImageUrl("/images/game.jpg"), "/images/game.jpg");
  assert.equal(helpers.getSafeMetadataImageUrl("javascript:alert(1)"), undefined);
  assert.equal(helpers.getSafeMetadataImageUrl("not a url"), undefined);
});

test("announcement detail metadata shares one cached published-only resolver", async () => {
  const [page, resolver] = await Promise.all([
    readSource("src/app/(public)/announcements/[id]/page.tsx"),
    readSource("src/app/(public)/announcements/[id]/announcement-detail.ts"),
  ]);

  assert.match(page, /export const generateMetadata = withServerErrorReference\(generateMetadataContent/);
  assert.equal((page.match(/await getPublishedAnnouncement\(id\)/g) ?? []).length, 2);
  assert.match(page, /const canonical = `\/announcements\/\$\{announcement\.id\}`/);
  assert.match(page, /alternates:\s*\{ canonical \}/);
  assert.match(page, /type:\s*"article"/);
  assert.doesNotMatch(page, /announcementsService\./);

  assert.match(resolver, /cache\(async \(rawId: string\)/);
  assert.match(resolver, /positiveIntegerIdSchema\.safeParse\(rawId\)/);
  assert.equal((resolver.match(/announcementsService\.getPublishedById\(/g) ?? []).length, 1);
  assert.match(resolver, /if \(!id\.success\) notFound\(\)/);
  assert.match(resolver, /if \(!announcement\) notFound\(\)/);
  assert.doesNotMatch(resolver, /getForAdmin|listForAdmin/);
});

test("board-game detail metadata shares identity only and safely omits invalid images", async () => {
  const [page, resolver] = await Promise.all([
    readSource("src/app/(public)/board-games/[id]/page.tsx"),
    readSource("src/app/(public)/board-games/[id]/board-game-detail.ts"),
  ]);

  assert.match(page, /export const generateMetadata = withServerErrorReference\(generateMetadataContent/);
  assert.equal((page.match(/await getBoardGameDetail\(id\)/g) ?? []).length, 2);
  assert.match(page, /const canonical = `\/board-games\/\$\{boardGame\.id\}`/);
  assert.match(page, /alternates:\s*\{ canonical \}/);
  assert.match(page, /getSafeMetadataImageUrl\(boardGame\.image\)/);
  assert.match(page, /const normalizedName = createMetadataDescription\(boardGame\.name\)/);
  assert.match(page, /查看「\$\{normalizedName\}」的分類、位置與借用資訊。/);
  const metadataImplementation = page.slice(
    page.indexOf("async function generateMetadataContent"),
    page.indexOf("async function BoardGameDetailPage"),
  );
  assert.doesNotMatch(metadataImplementation, /getCurrentUser|membershipService|OpenBorrowing/);
  assert.doesNotMatch(page, /popularity|completedBorrowCount/);

  assert.match(resolver, /cache\(async \(rawId: string\)/);
  assert.match(resolver, /z\.uuid\(\)\.safeParse\(rawId\)/);
  assert.equal(
    (resolver.match(/boardGamesService\.getBoardGameWithCategoryAndLocation\(/g) ?? []).length,
    1,
  );
  assert.match(resolver, /if \(!id\.success\) notFound\(\)/);
  assert.match(resolver, /error instanceof BoardNotFoundError/);
  assert.match(resolver, /throw error/);
});
