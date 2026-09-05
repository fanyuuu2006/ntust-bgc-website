import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("public announcements compose a compact divider-based bulletin list while preserving query states and pagination", async () => {
  const listPath =
    "src/components/(public)/announcements/AnnouncementList.tsx";
  await access(new URL(listPath, root));

  const [page, list] = await Promise.all([
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource(listPath),
  ]);

  assert.match(page, /<AnnouncementList[^>]*announcements=/);
  assert.match(page, /<QueryEmptyState/);
  assert.match(page, /<EmptyState/);
  assert.match(page, /<Pagination/);
  assert.match(page, /method="GET"/);
  assert.match(page, /announcementsService\.listPublished/);

  assert.match(list, /<ul[^>]*>/);
  assert.match(list, /<li[^>]*>/);
  assert.match(list, /<article[^>]*>/);
  assert.match(list, /<time[^>]*dateTime=/);
  assert.match(list, /<h2[^>]*>/);
  assert.match(list, /line-clamp-2/);
  assert.match(list, /href=\{`\/announcements\/\$\{announcement\.id\}`\}/);
  assert.match(list, /border-b/);
  assert.match(list, /announcement\.content\s*\?/);
  assert.match(list, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.doesNotMatch(list, /查看公告|ArrowRight/);
  assert.doesNotMatch(
    list,
    /\bcard\b|rounded-(?:xl|2xl)|overflow-hidden|shadow-(?:base|card|hover)/,
  );
  assert.doesNotMatch(list, /translate-y|min-h-|grid-cols-\[7\.5rem_/);
  assert.doesNotMatch(list, /"use client"|useEffect|fetch\(/);
});

test("published announcement detail is a narrow server-rendered article without giant Card chrome", async () => {
  const detail = await readSource(
    "src/app/(public)/announcements/[id]/page.tsx",
  );

  assert.match(detail, /announcementsService\.getPublishedById/);
  assert.match(detail, /if \(!announcement\) notFound\(\)/);
  assert.match(detail, /<article[^>]*>/);
  assert.equal((detail.match(/<h1\b/g) ?? []).length, 1);
  assert.match(detail, /<time[^>]*dateTime=/);
  assert.match(detail, /announcement\.published_at\s*\?\?/);
  assert.match(detail, /whitespace-pre-wrap/);
  assert.match(detail, /break-words/);
  assert.match(detail, /overflow-wrap:anywhere/);
  assert.match(detail, /href="\/announcements"/);
  assert.match(detail, /max-w-3xl/);
  assert.doesNotMatch(detail, /import \{ Card \}|className="[^"]*\bcard\b/);
  assert.doesNotMatch(
    detail,
    /"use client"|dangerouslySetInnerHTML|useEffect|fetch\(/,
  );
});
