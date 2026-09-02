import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("events keep URL-driven status and sort controls while status remains derived", async () => {
  const [page, status, service] = await Promise.all([
    readSource("src/app/(admin)/admin/events/page.tsx"),
    readSource("src/components/(admin)/admin/events/EventStatusBadge.tsx"),
    readSource("src/services/events/events.service.ts"),
  ]);
  assert.match(page, /name="status"/);
  assert.match(page, /name="orderBy"/);
  assert.match(status, /即將開始/);
  assert.match(status, /進行中/);
  assert.match(status, /已結束/);
  assert.match(service, /membershipService\.isCurrentActiveMember/);
  assert.match(service, /attended_at: data\.status === "absent" \? null/);
});

test("academic-year updates use an atomic RPC that recomputes every affected user's derived membership type", async () => {
  const [repository, migration, snapshot, verification] = await Promise.all([
    readSource("src/repositories/academic-years.repository.ts"),
    readSource("supabase/migrations/202609020001_update_academic_year_with_membership_recompute.sql"),
    readSource("supabase/schema/canonical-public-schema.sql"),
    readSource("supabase/verification/202609020001_update_academic_year_membership_recompute.sql"),
  ]);

  assert.match(repository, /rpc\("update_academic_year"/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /recompute_membership_types_for_user/);
  assert.match(migration, /from public\.officer_positions/);
  assert.match(migration, /from public\.memberships/);
  assert.match(snapshot, /create function public\.update_academic_year/);
  assert.match(snapshot, /grant execute on function public\.update_academic_year/);
  assert.match(verification, /Case A failed/);
  assert.match(verification, /Case B failed/);
  assert.match(verification, /rollback;/);
});

test("academic-year deletion checks register-key references before reaching the database foreign key", async () => {
  const [service, repository] = await Promise.all([
    readSource("src/services/academic-years/academic-years.service.ts"),
    readSource("src/repositories/membership-register-keys.repository.ts"),
  ]);

  assert.match(service, /membershipRegisterKeysRepository\.countByAcademicYearId/);
  assert.match(repository, /countByAcademicYearId/);
});

test("academic-year composition keeps header, query, and records on the admin page grid", async () => {
  const [page, records] = await Promise.all([
    readSource("src/app/(admin)/admin/academic-years/page.tsx"),
    readSource("src/components/(admin)/admin/academic-years/AcademicYearRecords.tsx"),
  ]);

  assert.doesNotMatch(page, /max-w-3xl/);
  assert.doesNotMatch(records, /max-w-3xl/);
});

test("ClearableSearchInput is the single search-icon owner and academic-year deletion stays a canonical danger action", async () => {
  const [search, page, actions] = await Promise.all([
    readSource("src/components/(admin)/admin/ClearableSearchInput.tsx"),
    readSource("src/app/(admin)/admin/academic-years/page.tsx"),
    readSource("src/components/(admin)/admin/academic-years/AcademicYearActions.tsx"),
  ]);

  assert.match(search, /<Search/);
  assert.doesNotMatch(page, /import \{ Search \}/);
  assert.match(actions, /variant="danger"/);
  assert.doesNotMatch(actions, /variant="text" className="text-\(--status-danger\)"/);
});

test("event deletion is blocked by attendance history with a domain error instead of a foreign-key failure", async () => {
  const [service, repository] = await Promise.all([
    readSource("src/services/events/events.service.ts"),
    readSource("src/repositories/event-attendances.repository.ts"),
  ]);

  assert.match(service, /EventHasAttendanceRecordsError/);
  assert.match(service, /countByEventId/);
  assert.match(repository, /countByEventId/);
});

test("announcement editing exposes a confirmed delete action without altering published-at semantics", async () => {
  const [editor, route, service] = await Promise.all([
    readSource("src/components/(admin)/admin/announcements/AnnouncementEditor.tsx"),
    readSource("src/app/api/admin/announcements/[id]/route.ts"),
    readSource("src/services/announcements/announcements.service.ts"),
  ]);

  assert.match(editor, /ConfirmDialog/);
  assert.match(editor, /DELETE/);
  assert.match(route, /export async function DELETE/);
  assert.match(service, /data\.is_published && !current\.is_published/);
});

test("announcements retain draft-publication semantics and expose natural query controls", async () => {
  const [page, service, repository] = await Promise.all([
    readSource("src/app/(admin)/admin/announcements/page.tsx"),
    readSource("src/services/announcements/announcements.service.ts"),
    readSource("src/repositories/announcements.repository.ts"),
  ]);
  assert.match(page, /搜尋公告標題或內容/);
  assert.match(page, /name="orderBy"/);
  assert.match(service, /data\.is_published && !current\.is_published/);
  assert.match(repository, /eq\("is_published", true\)/);
});

test("academic years keep transactional current-year updates and explicit current context", async () => {
  const [records, actions, repository, schema] = await Promise.all([
    readSource("src/components/(admin)/admin/academic-years/AcademicYearRecords.tsx"),
    readSource("src/components/(admin)/admin/academic-years/AcademicYearActions.tsx"),
    readSource("src/repositories/academic-years.repository.ts"),
    readSource("src/services/academic-years/academic-years.schema.ts"),
  ]);
  assert.match(records, /目前學年度/);
  assert.match(actions, /confirmVariant=\{workflow === "delete" \? "danger" : "primary"\}/);
  assert.match(repository, /rpc\("set_current_academic_year"/);
  assert.match(schema, /結束日期必須晚於開始日期/);
});

test("every admin search form exposes a primary text-only submit while ClearableSearchInput owns the icon", async () => {
  const searchPages = [
    "src/app/(admin)/admin/academic-years/page.tsx",
    "src/app/(admin)/admin/users/page.tsx",
    "src/app/(admin)/admin/board-games/categories/page.tsx",
    "src/app/(admin)/admin/board-games/locations/page.tsx",
    "src/components/(admin)/admin/board-games/BoardGameSearchForm.tsx",
    "src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx",
    "src/components/(admin)/admin/memberships/MembershipFilterBar.tsx",
    "src/components/(admin)/admin/memberships/RegisterKeyFilterBar.tsx",
    "src/app/(admin)/admin/officers/page.tsx",
    "src/app/(admin)/admin/events/page.tsx",
    "src/app/(admin)/admin/announcements/page.tsx",
  ];
  const [input, ...sources] = await Promise.all([
    readSource("src/components/(admin)/admin/ClearableSearchInput.tsx"),
    ...searchPages.map(readSource),
  ]);

  assert.match(input, /<Search/);

  for (const source of sources) {
    assert.match(source, /<Button type="submit" variant="primary"/);
    assert.match(source, />\s*搜尋\s*<\/Button>/);
    assert.doesNotMatch(source, /type="submit" variant="outline"/);
    assert.doesNotMatch(source, /import \{ Search \} from "lucide-react"/);
  }
});

test("admin borrowing records compose approver identity in one server batch and render state-aware actor metadata", async () => {
  const [service, types, list] = await Promise.all([
    readSource("src/services/board-games/board-games.service.ts"),
    readSource("src/services/board-games/board-games.types.ts"),
    readSource("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx"),
  ]);

  assert.match(service, /approved_by_user_id/);
  assert.match(service, /approversById/);
  assert.match(service, /usersRepository\.findManyByIds\(approverIds\)/);
  assert.match(service, /userProfilesRepository\.findManyByUserIds\(identityUserIds\)/);
  assert.match(service, /approved_by_user_id: approverUserId/);
  assert.match(types, /approved_by_user: User \| null/);
  assert.match(types, /approved_by_user_profile: UserProfile \| null/);
  assert.match(list, /approved_by_user/);
  assert.match(list, /getApprovalActorLine/);
  assert.match(list, /"核准人"/);
  assert.match(list, /"拒絕人"/);
  assert.match(list, /router\.refresh\(\)/);
  assert.doesNotMatch(list, /approved_by_user_id\}/);
});
