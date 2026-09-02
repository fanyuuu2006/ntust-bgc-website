import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("button variants express bounded visual emphasis rather than logo palette roles", async () => {
  const [button, styles] = await Promise.all([
    readSource("src/components/ui/Button.tsx"),
    readSource("src/styles/globals.css"),
  ]);

  assert.match(button, /"primary" \| "outline" \| "ghost" \| "text" \| "danger"/);
  assert.doesNotMatch(button, /"secondary"/);
  assert.match(styles, /--action:/);
  assert.match(styles, /\.btn\.text/);
  assert.doesNotMatch(styles, /\.btn\.secondary/);
});

test("text actions keep navigation semantics without boxed button treatment", async () => {
  const [borrowings, history, dashboardMembership] = await Promise.all([
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/components/(authenticated)/profile/HistorySection.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardMembershipSummary.tsx"),
  ]);

  for (const source of [borrowings, history, dashboardMembership]) {
    assert.match(source, /ButtonLink/);
    assert.match(source, /variant="text"/);
  }
});

test("contextual controls use ghost or outline rather than the retired secondary role", async () => {
  const [mobileNavigation, boardGameToolbar] = await Promise.all([
    readSource("src/components/Header/MobileNavigation.tsx"),
    readSource("src/components/(public)/board-games/BoardGameSearchForm.tsx"),
  ]);

  assert.match(mobileNavigation, /variant="ghost"/);
  assert.match(boardGameToolbar, /btn outline/);
  assert.match(boardGameToolbar, /variant="outline"/);
  assert.doesNotMatch(boardGameToolbar, /secondary/);
});

test("primitive styles remain intrinsic and do not impose parent layout", async () => {
  const [button, card] = await Promise.all([
    readSource("src/components/ui/Button.tsx"),
    readSource("src/components/ui/Card.tsx"),
  ]);

  assert.doesNotMatch(button, /w-full|mx-auto|grid-column/);
  assert.doesNotMatch(card, /w-full|mx-auto|grid-column/);
});
