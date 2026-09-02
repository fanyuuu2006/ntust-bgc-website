import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("semantic accents distinguish current, active, attention, and urgent states", async () => {
  const [history, membershipStatus, borrowingStatus, borrowingRecord] = await Promise.all([
    readSource("src/components/(authenticated)/memberships/MembershipHistory.tsx"),
    readSource("src/components/MembershipStatusBadge.tsx"),
    readSource("src/components/BorrowingStatusBadge.tsx"),
    readSource("src/components/(authenticated)/borrowings/BorrowingRecord.tsx"),
  ]);

  assert.match(history, /<Badge tone="info">目前<\/Badge>/);
  assert.doesNotMatch(history, /<Badge tone="neutral">目前<\/Badge>/);
  assert.match(membershipStatus, /active:\s*"success"/);
  assert.match(membershipStatus, /pending:\s*"warning"/);
  assert.match(borrowingStatus, /pending:\s*"warning"/);
  assert.match(borrowingStatus, /borrowed:\s*"success"/);
  assert.match(borrowingRecord, /due\.state === "due-soon"/);
  assert.match(borrowingRecord, /text-\(--status-warning\)/);
  assert.match(borrowingRecord, /text-\(--status-danger\)/);
  assert.match(borrowingRecord, /text-\(--status-info\)/);
});

test("section accents reuse semantic tokens without adding colored card backgrounds", async () => {
  const [dashboard, membershipSummary, currentMembership, styles] = await Promise.all([
    readSource("src/app/(authenticated)/dashboard/page.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardMembershipSummary.tsx"),
    readSource("src/components/(authenticated)/memberships/CurrentMembershipCard.tsx"),
    readSource("src/styles/globals.css"),
  ]);

  assert.match(dashboard, /Megaphone[^>]*text-\(--status-warning\)/);
  assert.match(membershipSummary, /BadgeCheck[^>]*text-\(--status-success\)/);
  assert.match(currentMembership, /border-l-4 border-l-\(--interactive-primary\)/);
  assert.doesNotMatch(styles, /--(?:dashboard-blue|membership-green|announcement-yellow|borrowing-cyan)\s*:/);
  assert.match(styles, /--status-info:/);
  assert.match(styles, /--status-success:/);
  assert.match(styles, /--status-warning:/);
  assert.match(styles, /--status-danger:/);
});
