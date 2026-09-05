import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("profile keeps identity, club footprint, and current club context without operational mini-histories", async () => {
  const page = await readSource("src/app/(authenticated)/profile/page.tsx");

  assert.match(page, /ProfileClubFootprint/);
  assert.match(page, /ProfileDetailsSection/);
  assert.match(page, /getTotalBorrowedCount/);
  assert.match(page, /getAttendedCountByCurrentAcademicYear/);
  assert.doesNotMatch(page, /getCurrentlyBorrowedCount/);
  assert.doesNotMatch(
    page,
    /HistorySection|ProfileBasicInfoSection|ProfileClubInformation|getBorrowingsByUserId|getAttendancesByUserId/,
  );
});

test("profile club footprint counts actual borrowing and attendance participation only", async () => {
  const [borrowings, events] = await Promise.all([
    readSource("src/services/board-games/board-games.service.ts"),
    readSource("src/services/events/events.service.ts"),
  ]);

  assert.match(borrowings, /countByUserId\(userId, \[\s*"borrowed",\s*"returned",\s*\]\)/);
  assert.match(events, /COUNTED_STATUSES: AttendanceStatus\[\] = \["present", "late"\]/);
});

test("profile identity badges derive established membership and officer facts with an accessible bounded disclosure", async () => {
  const [service, badges, hero] = await Promise.all([
    readSource("src/services/profile/profile.service.ts"),
    readSource("src/components/(authenticated)/profile/ProfileIdentityBadges.tsx"),
    readSource("src/components/(authenticated)/profile/ProfileHeroSection.tsx"),
  ]);

  assert.match(service, /ESTABLISHED_MEMBERSHIP_STATUSES/);
  assert.match(service, /"active",\s*"expired"/);
  assert.match(service, /current-membership|historical-membership|officer|non-member/);
  assert.match(service, /academic_year\.start_date/);
  assert.match(badges, /MAX_VISIBLE_BADGES = 4/);
  assert.match(badges, /historical-membership[\s\S]*tone: "info"/);
  assert.match(badges, /--primary/);
  assert.match(badges, /aria-expanded/);
  assert.match(badges, /hiddenBadges\.length/);
  assert.match(hero, /ProfileIdentityBadges/);
  assert.match(hero, /user\.name/);
  assert.match(hero, /profile\.real_name/);
  assert.doesNotMatch(hero, />\s*真實姓名\s*</);
  assert.doesNotMatch(hero, /currentMembership|currentOfficerPositions/);
});

test("profile club context distinguishes current, historical, and never-member users without new permissions", async () => {
  const [profileDetails, service] = await Promise.all([
    readSource("src/components/(authenticated)/profile/ProfileDetailsSection.tsx"),
    readSource("src/services/profile/profile.service.ts"),
  ]);

  assert.match(profileDetails, /MembershipStatusBadge/);
  assert.match(profileDetails, /\/memberships/);
  assert.match(profileDetails, /hasMembershipHistory/);
  assert.match(profileDetails, /個人資料/);
  assert.match(profileDetails, /社團資訊/);
  assert.match(profileDetails, /profile\.real_name/);
  assert.match(profileDetails, /profile\.phone/);
  assert.match(profileDetails, /profile\.student_id/);
  assert.match(profileDetails, /profile\.school/);
  assert.match(profileDetails, /profile\.department/);
  assert.match(profileDetails, /profile\.grade/);
  assert.match(service, /hasMembershipHistory/);
  assert.doesNotMatch(service, /hasEverBeenOfficer|isAdminByUserId/);
});

test("profile footprint uses one section surface with restrained semantic accents", async () => {
  const footprint = await readSource(
    "src/components/(authenticated)/profile/ProfileClubFootprint.tsx",
  );

  assert.match(footprint, /lucide-react/);
  assert.match(footprint, /--status-info/);
  assert.match(footprint, /--status-success/);
  assert.match(footprint, /--status-warning/);
  assert.match(footprint, /Card/);
  assert.doesNotMatch(footprint, /借用中桌遊數量/);
});
