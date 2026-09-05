import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard keeps a greeting-only header and separates content from entity surfaces", async () => {
  const [page, borrowing, checkIn, membership] = await Promise.all([
    readSource("src/app/(authenticated)/dashboard/page.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx"),
    readSource("src/components/(authenticated)/dashboard/SelfCheckInEvents.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardMembershipSummary.tsx"),
  ]);

  assert.match(page, /PageHeader title=\{`/);
  assert.doesNotMatch(page, /eyebrow=|description=|今天想做些什麼/);
  assert.match(page, /<section className="container py-8">[\s\S]*?<div className="space-y-6">/);
  assert.match(page, /lg:grid-cols-\[minmax\(0,3fr\)_minmax\(0,2fr\)\]/);
  assert.doesNotMatch(page, /grid items-start gap-5 lg:grid-cols-2/);
  assert.match(page, /import \{ Card \}/);
  assert.match(page, /Megaphone/);
  assert.match(page, /ArrowRight/);
  assert.match(borrowing, /PackageOpen|CalendarClock|TriangleAlert/);
  assert.match(borrowing, /<Card className="p-4">/);
  assert.doesNotMatch(borrowing, /divide-y/);
  assert.match(checkIn, /ClipboardCheck|Clock3/);
  assert.match(checkIn, /<Card className="p-4">/);
  assert.doesNotMatch(checkIn, /"use client"|divide-y/);
  assert.match(membership, /BadgeCheck/);
  assert.match(membership, /surface=\{hasCurrentMembership \? "default" : "elevated"\}/);
  assert.match(membership, /<Card/);
});

test("dashboard borrowing uses a bounded urgency-first server summary and server-rendered due time", async () => {
  const [service, summary, date] = await Promise.all([
    readSource("src/services/board-games/board-games.service.ts"),
    readSource("src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx"),
    readSource("src/utils/date.tsx"),
  ]);

  assert.match(service, /getDashboardOpenBorrowingsByUserId/);
  assert.match(service, /const DASHBOARD_BORROWING_LIMIT = 3/);
  assert.match(service, /status: "borrowed"[\s\S]*?orderBy: "due_at"[\s\S]*?orderDirection: "asc"/);
  assert.match(service, /status: "approved"[\s\S]*?orderBy: "created_at"[\s\S]*?orderDirection: "asc"/);
  assert.match(service, /status: "pending"[\s\S]*?orderBy: "created_at"[\s\S]*?orderDirection: "asc"/);
  assert.match(service, /takeDashboardBorrowings/);
  assert.doesNotMatch(service, /firstPage\.totalPages|pageSize = 100/);
  assert.match(summary, /flex flex-col gap-1\.5/);
  assert.doesNotMatch(summary, /borrowings\.slice/);
  assert.match(summary, /getDueTimePresentation/);
  assert.match(summary, /CalendarClock/);
  assert.match(summary, /TriangleAlert/);
  assert.match(date, /CLUB_TIME_ZONE = "Asia\/Taipei"/);
  assert.match(date, /DueTimePresentation/);
});

test("membership records are complete, URL-driven, and paginated without a client page", async () => {
  const [page, toolbar, history, results, service, repository, presentation] = await Promise.all([
    readSource("src/app/(authenticated)/memberships/page.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsToolbar.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipHistory.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsResults.tsx"),
    readSource("src/services/memberships/memberships.service.ts"),
    readSource("src/repositories/memberships.repository.ts"),
    readSource("src/utils/membership.ts"),
  ]);

  assert.doesNotMatch(page, /"use client"|Manager|Controller|Container/);
  assert.match(page, /searchParams/);
  assert.match(results, /listMembershipRecordsByUserId/);
  assert.match(results, /showPageSize=\{false\}/);
  assert.doesNotMatch(page, /membership\.id !== currentYearMembership/);
  assert.match(toolbar, /<form method="GET" action="\/memberships"/);
  assert.match(toolbar, /name="search"|name="type"|name="status"|name="orderDirection"/);
  assert.match(toolbar, /ClearableSearchInput/);
  assert.match(toolbar, /QueryFilterDisclosure/);
  assert.match(toolbar, /ArrowUpDown/);
  assert.match(history, /History/);
  assert.match(results, /<Card className="p-4">/);
  assert.match(results, /currentMembershipId/);
  assert.match(service, /findAllMembershipsByUserId/);
  assert.match(service, /firstPage\.totalPages/);
  assert.match(service, /compareMembershipRecords/);
  assert.match(service, /matchesMembershipRecordSearch/);
  assert.match(repository, /type\?: MembershipType/);
  assert.match(repository, /status\?: MembershipStatus/);
  assert.match(presentation, /MEMBERSHIP_TYPE_LABEL|MEMBERSHIP_STATUS_LABEL/);
});

test("membership current and activation surfaces stay canonical while records remain independent", async () => {
  const [current, activation, statusBadge] = await Promise.all([
    readSource("src/components/(authenticated)/memberships/CurrentMembershipCard.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipActivationForm.tsx"),
    readSource("src/components/MembershipStatusBadge.tsx"),
  ]);

  assert.match(current, /BadgeCheck/);
  assert.match(current, /<Card/);
  assert.match(current, /MEMBERSHIP_TYPE_LABEL/);
  assert.match(activation, /"use client"/);
  assert.match(activation, /KeyRound/);
  assert.match(activation, /surface="elevated"/);
  assert.match(statusBadge, /MEMBERSHIP_STATUS_LABEL/);
});
