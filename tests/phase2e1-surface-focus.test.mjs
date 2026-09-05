import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("touched entity records use canonical card surfaces while subtle internals remain purposeful", async () => {
  const [borrowing, checkIn, history, gameCard, detail] = await Promise.all([
    readSource("src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx"),
    readSource("src/components/(authenticated)/dashboard/SelfCheckInEvents.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsResults.tsx"),
    readSource("src/components/(public)/board-games/BoardGameCard.tsx"),
    readSource("src/app/(public)/board-games/[id]/page.tsx"),
  ]);

  for (const source of [borrowing, checkIn]) {
    assert.match(source, /<Card className="p-4">/);
    assert.match(source, /bg-\(--surface-subtle\) px-3 py-2\.5/);
    assert.doesNotMatch(source, /<Card surface="subtle"/);
  }
  assert.match(history, /<Card className="p-4">/);
  assert.doesNotMatch(history, /<Card surface="subtle" className="p-4">/);
  assert.match(gameCard, /bg-\(--surface-subtle\)/);
  assert.match(detail, /BoardGameImage/);
  assert.match(detail, /bg-\(--surface-subtle\)/);
});

test("select focus ownership is explicit without removing visible keyboard focus", async () => {
  const [styles, select, membership, boardGames, borrowings] = await Promise.all([
    readSource("src/styles/globals.css"),
    readSource("src/components/ui/Select.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx"),
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
  ]);

  assert.doesNotMatch(styles, /input, select, textarea, summary/);
  assert.match(styles, /\.ui-select:focus-visible/);
  assert.match(styles, /data-focus-owner="parent"/);
  assert.match(styles, /outline: 2px solid var\(--focus-ring\)/);
  assert.match(styles, /aria-invalid="true"/);
  assert.match(select, /focusOwner\?: "self" \| "parent"/);
  for (const source of [membership, boardGames, borrowings]) {
    assert.match(source, /focusOwner="parent"/);
    assert.match(source, /focus-within:outline-2/);
  }
});
