import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  return source.slice(
    startIndex,
    source.indexOf(end, startIndex + start.length),
  );
}

test("public board-game detail is an image-led page flow rather than a giant card", async () => {
  const page = await readSource(
    "src/app/(public)/board-games/[id]/page.tsx",
  );

  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(page, /href="\/board-games"/);
  assert.match(page, /返回桌遊列表/);
  assert.match(page, /mx-auto max-w-6xl/);
  assert.match(page, /lg:grid-cols-2/);
  assert.match(page, /aspect-4\/3/);
  assert.doesNotMatch(page, /lg:aspect-square/);
  assert.match(page, /object-contain/);
  assert.doesNotMatch(page, /object-cover/);
  assert.doesNotMatch(page, /import \{ Card \}|<Card\b/);
  assert.match(page, /<dl/);
  assert.equal((page.match(/<dt\b/g) ?? []).length, 3);
  assert.equal((page.match(/<dd\b/g) ?? []).length, 3);
  assert.match(page, /分類[\s\S]*boardGame\.category\.name/);
  assert.match(page, /位置[\s\S]*boardGame\.location\.name/);
  assert.match(page, /<dt[^>]*>社產編號<\/dt>/);
  assert.match(page, /<h2[^>]*id="board-game-description"/);
  assert.match(page, /桌遊介紹/);
  assert.match(page, /目前尚未補充這款桌遊的介紹。/);
  assert.match(page, /whitespace-pre-wrap/);
  assert.match(page, /break-words|overflow-wrap/);
  assert.doesNotMatch(page, /"use client"|useEffect|fetch\(/);
});

test("borrowing decision surface preserves every established user state", async () => {
  const [panel, form, service, repository, policy] = await Promise.all([
    readSource(
      "src/components/(public)/board-games/BoardGameBorrowingPanel.tsx",
    ),
    readSource("src/components/(public)/board-games/BorrowBoardGameForm.tsx"),
    readSource("src/services/board-games/board-games.service.ts"),
    readSource("src/repositories/board-game-borrowings.repository.ts"),
    readSource("src/libs/clubPolicies.ts"),
  ]);

  const existing = between(
    panel,
    "if (existingBorrowing)",
    'if (status !== "available")',
  );
  const unavailable = between(
    panel,
    'if (status !== "available")',
    "if (!isAuthenticated)",
  );
  const loggedOut = between(panel, "if (!isAuthenticated)", "\n  return (");
  const available = panel.slice(panel.lastIndexOf("return ("));

  assert.match(existing, /BorrowingStatusBadge/);
  assert.match(existing, /href="\/borrowings"/);
  assert.match(existing, /查看我的借用/);
  assert.doesNotMatch(existing, /BorrowBoardGameForm/);

  assert.match(unavailable, /目前無法借用/);
  assert.match(unavailable, /BOARD_GAME_STATUS_LABEL\[status\]/);
  assert.doesNotMatch(unavailable, /BorrowBoardGameForm/);

  assert.match(loggedOut, /登入後申請借用/);
  assert.match(
    loggedOut,
    /\/login\?returnTo=\$\{encodeURIComponent\(`\/board-games\/\$\{boardGameId\}`\)\}/,
  );
  assert.doesNotMatch(loggedOut, /BorrowBoardGameForm/);

  assert.match(available, /nonCurrentAcademicYearMemberBorrowingNotice/);
  assert.match(available, /BorrowBoardGameForm/);
  assert.doesNotMatch(available, /href="\/memberships"/);
  assert.match(policy, /nonCurrentAcademicYearMemberBorrowingNotice/);

  assert.match(form, /disabled=\{isSubmitting\}/);
  assert.match(form, /isSubmitting=\{isSubmitting\}/);
  assert.match(repository, /\.in\("status", \["pending", "approved", "borrowed"\]\)/);
  const requestBorrowing = between(
    service,
    "requestBorrowing:",
    "cancelPendingBorrowingByUserId:",
  );
  assert.doesNotMatch(requestBorrowing, /membership|isCurrentActiveMember/);
});

test("detail page keeps one server-owned data-read path", async () => {
  const page = await readSource(
    "src/app/(public)/board-games/[id]/page.tsx",
  );

  assert.equal(
    (page.match(/getBoardGameWithCategoryAndLocation\(/g) ?? []).length,
    1,
  );
  assert.equal((page.match(/getCurrentUser\(/g) ?? []).length, 1);
  assert.equal(
    (page.match(/getCurrentMembershipByUserId\(/g) ?? []).length,
    1,
  );
  assert.equal(
    (page.match(/getOpenBorrowingForUserAndBoardGame\(/g) ?? []).length,
    1,
  );
  assert.match(page, /Promise\.all\(/);
  assert.match(page, /BoardNotFoundError[\s\S]*notFound\(\)/);
});
