import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("authenticated navigation and dashboard do not expose a general events product", async () => {
  const [navigation, dashboard, checkIn] = await Promise.all([
    readSource("src/libs/navigation.tsx"),
    readSource("src/app/(authenticated)/dashboard/page.tsx"),
    readSource("src/components/(authenticated)/dashboard/SelfCheckInEvents.tsx"),
  ]);

  assert.doesNotMatch(navigation, /href: "\/events"/);
  assert.doesNotMatch(dashboard, /查看所有活動/);
  assert.doesNotMatch(checkIn, /href="\/events"/);
  await assert.rejects(access(new URL("../src/app/(authenticated)/events/page.tsx", import.meta.url)));
});

test("dashboard keeps the check-in surface scoped to open events and supports zero to many records", async () => {
  const [dashboard, checkIn, service, repository, attendances] = await Promise.all([
    readSource("src/app/(authenticated)/dashboard/page.tsx"),
    readSource("src/components/(authenticated)/dashboard/SelfCheckInEvents.tsx"),
    readSource("src/services/events/events.service.ts"),
    readSource("src/repositories/events.repository.ts"),
    readSource("src/repositories/event-attendances.repository.ts"),
  ]);

  assert.match(dashboard, /getSelfCheckInEventsForUser/);
  assert.match(dashboard, /currentYearMembership\?\.status === "active"/);
  assert.match(checkIn, /目前沒有可簽到的活動/);
  assert.match(checkIn, /flex flex-col gap-1\.5/);
  assert.doesNotMatch(checkIn, /grid-cols-/);
  assert.match(checkIn, /events\.map/);
  assert.match(checkIn, /<CheckInButton/);
  assert.match(service, /findOpenForSelfCheckIn/);
  assert.match(service, /findManyByUserIdAndEventIds/);
  assert.doesNotMatch(service, /getMemberEventsForUser/);
  assert.match(repository, /findOpenForSelfCheckIn/);
  assert.doesNotMatch(repository, /findOpenForSelfCheckIn[\s\S]*?\.limit\(10\)/);
  assert.doesNotMatch(repository, /findAllForMember/);
  assert.match(attendances, /\.eq\("user_id", userId\)/);
  assert.match(attendances, /\.in\("event_id", eventIds\)/);
});

test("dashboard check-in preserves the server-owned membership gate and duplicate race refresh", async () => {
  const [button, service] = await Promise.all([
    readSource("src/components/(authenticated)/dashboard/CheckInButton.tsx"),
    readSource("src/services/events/events.service.ts"),
  ]);

  assert.match(button, /\/api\/events\/\$\{eventId\}\/check-in/);
  assert.match(button, /router\.refresh\(\)/);
  assert.match(button, /caught instanceof ApiError && caught\.status === 409/);
  assert.match(service, /membershipService\.isCurrentActiveMember/);
  assert.match(service, /SelfCheckInAlreadyCompletedError/);
  assert.match(service, /SelfCheckInClosedError/);
});

test("dashboard current-record surfaces stay compact, responsive, and domain-specific", async () => {
  const [page, checkIn, borrowings, membership] = await Promise.all([
    readSource("src/app/(authenticated)/dashboard/page.tsx"),
    readSource("src/components/(authenticated)/dashboard/SelfCheckInEvents.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardMembershipSummary.tsx"),
  ]);

  assert.match(page, /<section className="container py-8">[\s\S]*?<div className="space-y-6">/);
  assert.match(page, /lg:grid-cols-\[minmax\(0,3fr\)_minmax\(0,2fr\)\]/);
  assert.doesNotMatch(page, /grid items-start gap-5 lg:grid-cols-2/);
  assert.doesNotMatch(page, /xl:grid-cols-|justify-self-end|xl:max-w-/);
  assert.match(checkIn, /<Card className="p-4">/);
  assert.match(checkIn, /break-words/);
  assert.match(borrowings, /目前沒有進行中的借用/);
  assert.match(borrowings, /flex flex-col gap-1\.5/);
  assert.doesNotMatch(borrowings, /grid-cols-|min-\[420px\]:flex-row/);
  assert.match(borrowings, /break-words/);
  assert.doesNotMatch(borrowings, /EmptyState|truncate|borrowings\.slice/);
  assert.match(membership, /min-w-0/);
  assert.match(membership, /shrink-0 px-0/);
});

test("dashboard uses an asymmetric operational and context composition without desktop record grids", async () => {
  const [page, header, checkIn, borrowings, membership] = await Promise.all([
    readSource("src/app/(authenticated)/dashboard/page.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardSectionHeader.tsx"),
    readSource("src/components/(authenticated)/dashboard/SelfCheckInEvents.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardMembershipSummary.tsx"),
  ]);

  assert.match(
    page,
    /grid items-start gap-5 lg:grid-cols-\[minmax\(0,3fr\)_minmax\(0,2fr\)\][\s\S]*?<SelfCheckInEvents[\s\S]*?<DashboardBorrowingSummary[\s\S]*?<DashboardMembershipSummary[\s\S]*?<Card className="p-4">/,
  );
  assert.match(
    page,
    /academicYearLabel=\{currentAcademicYear\?\.year\}[\s\S]*?<Card className="p-4">/,
  );
  assert.match(page, /<Card className="p-4">/);
  assert.match(header, /DashboardSectionHeader/);
  assert.match(checkIn, /<DashboardSectionHeader/);
  assert.match(checkIn, /bg-\(--surface-subtle\) px-3 py-2\.5/);
  assert.match(checkIn, /<ul className="mt-3 flex flex-col gap-1\.5">/);
  assert.match(borrowings, /<DashboardSectionHeader/);
  assert.match(borrowings, /bg-\(--surface-subtle\) px-3 py-2\.5/);
  assert.match(borrowings, /<ul className="mt-3 flex flex-col gap-1\.5">/);
  assert.match(membership, /<DashboardSectionHeader/);
});

test("dashboard summaries keep operational records bounded while check-in remains complete", async () => {
  const [page, borrowingService, announcementsService, eventsRepository] = await Promise.all([
    readSource("src/app/(authenticated)/dashboard/page.tsx"),
    readSource("src/services/board-games/board-games.service.ts"),
    readSource("src/services/announcements/announcements.service.ts"),
    readSource("src/repositories/events.repository.ts"),
  ]);

  assert.match(page, /getDashboardLatestPublished/);
  assert.doesNotMatch(page, /Pagination|listPublished\(\{ page: 1, pageSize: 3 \}\)/);
  assert.match(borrowingService, /DASHBOARD_BORROWING_LIMIT = 3/);
  assert.match(borrowingService, /takeDashboardBorrowings/);
  assert.match(announcementsService, /DASHBOARD_ANNOUNCEMENT_LIMIT = 3/);
  assert.match(announcementsService, /getDashboardLatestPublished/);
  assert.doesNotMatch(eventsRepository, /findOpenForSelfCheckIn[\s\S]*?\.limit\(/);
});
