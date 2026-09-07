import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

function backLink(source, href) {
  return (
    source.match(
      new RegExp(`<ButtonLink[\\s\\S]*?href="${href}"[\\s\\S]*?</ButtonLink>`),
    )?.[0] ?? ""
  );
}

test("public detail routes share page-top and back-navigation grammar", async () => {
  const [announcement, boardGame] = await Promise.all([
    readSource("src/app/(public)/announcements/[id]/page.tsx"),
    readSource("src/app/(public)/board-games/[id]/page.tsx"),
  ]);

  for (const source of [announcement, boardGame]) {
    assert.match(source, /<section className="py-8">/);
    assert.doesNotMatch(
      source,
      /border-b[^\n]*bg-\(--surface-|bg-\(--surface-[^)]+\)[^\n]*<PageHeader/,
    );
  }

  const announcementBack = backLink(announcement, "/announcements");
  const boardGameBack = backLink(boardGame, "/board-games");

  for (const link of [announcementBack, boardGameBack]) {
    assert.match(link, /variant="text"/);
    assert.match(link, /size="sm"/);
    assert.match(link, /className="px-0"/);
    assert.match(link, /<ArrowLeft[^>]*className="size-4"/);
  }
});

test("announcement detail remains a compact readable plain-text article", async () => {
  const [detail, resolver] = await Promise.all([
    readSource("src/app/(public)/announcements/[id]/page.tsx"),
    readSource("src/app/(public)/announcements/[id]/announcement-detail.ts"),
  ]);

  assert.match(detail, /getPublishedAnnouncement\(id\)/);
  assert.match(resolver, /announcementsService\.getPublishedById/);
  assert.match(resolver, /if \(!announcement\) notFound\(\)/);
  assert.match(detail, /<article className="mt-5 min-w-0">/);
  assert.match(detail, /<header[^>]*border-b/);
  assert.match(detail, /<time[^>]*dateTime=/);
  assert.equal((detail.match(/<h1\b/g) ?? []).length, 1);
  assert.match(detail, /max-w-3xl/);
  assert.match(detail, /whitespace-pre-wrap/);
  assert.match(detail, /overflow-wrap:anywhere/);
  assert.doesNotMatch(
    detail,
    /dangerouslySetInnerHTML|import \{ Card \}|<Card\b|["']use client["']|fetch\(/,
  );
});

test("board-game identity uses explicit metadata and decision groups", async () => {
  const detail = await readSource(
    "src/app/(public)/board-games/[id]/page.tsx",
  );

  assert.match(detail, /className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2/);
  assert.doesNotMatch(detail, /className="min-w-0 space-y-4"/);
  assert.match(detail, /<dl className="mt-5 [^"]*grid/);
  assert.match(detail, /<div className="mt-5">\s*<BoardGameBorrowingPanel/);
  assert.match(detail, /aspect-4\/3/);
  assert.match(detail, /<dl/);
  assert.match(detail, /<h2[^>]*id="board-game-description"/);
});

test("board-game detail preserves server reads and borrowing confirmation boundaries", async () => {
  const [page, resolver, panel, form] = await Promise.all([
    readSource("src/app/(public)/board-games/[id]/page.tsx"),
    readSource("src/app/(public)/board-games/[id]/board-game-detail.ts"),
    readSource("src/components/(public)/board-games/BoardGameBorrowingPanel.tsx"),
    readSource("src/components/(public)/board-games/BorrowBoardGameForm.tsx"),
  ]);

  assert.equal(
    (resolver.match(/getBoardGameWithCategoryAndLocation\(/g) ?? []).length,
    1,
  );
  assert.match(page, /getBoardGameDetail\(id\)/);
  assert.match(page, /Promise\.all\(/);
  assert.doesNotMatch(page, /["']use client["']|useEffect|fetch\(/);
  assert.match(panel, /if \(existingBorrowing\)/);
  assert.match(panel, /if \(status !== "available"\)/);
  assert.match(panel, /if \(!isAuthenticated\)/);
  assert.match(panel, /BorrowBoardGameForm/);
  assert.match(form, /<ConfirmDialog/);
  assert.match(form, /onConfirm=\{handleSubmit\}/);
});
