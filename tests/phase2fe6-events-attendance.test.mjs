import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("event records expose an explicit attendance-management action instead of title-only navigation", async () => {
  const records = await readSource("src/components/(admin)/admin/events/EventRecords.tsx");

  assert.match(records, /簽到管理/);
  assert.match(records, /href=\{`\/admin\/events\/\$\{event\.id\}`\}/);
});

test("event attendance detail uses URL-authoritative search and pagination without loading a client-side user list", async () => {
  const page = await readSource("src/app/(admin)/admin/events/[id]/page.tsx");

  assert.match(page, /ClearableSearchInput/);
  assert.match(page, /<Button type="submit" variant="primary"/);
  assert.match(page, />\s*搜尋\s*<\/Button>/);
  assert.match(page, /<Pagination/);
  assert.doesNotMatch(page, /usersService\.listForAdmin\(\{ pageSize: 100 \}\)/);
});

test("attendance list composes searched user and profile identities in server batches", async () => {
  const [service, repository] = await Promise.all([
    readSource("src/services/events/events.service.ts"),
    readSource("src/repositories/event-attendances.repository.ts"),
  ]);

  assert.match(service, /listAttendancesForAdmin: async \(eventId: string, options/);
  assert.match(service, /usersRepository\.findIdsBySearch/);
  assert.match(service, /userProfilesRepository\.findUserIdsBySearch/);
  assert.match(service, /usersRepository\.findManyByIds\(userIds\)/);
  assert.match(service, /userProfilesRepository\.findManyByUserIds\(userIds\)/);
  assert.match(repository, /user_id\?: string \| string\[\]/);
  assert.match(repository, /query\.in\("user_id", options\.user_id\)/);
});

test("attendance updates and deletes are scoped to the event route and retain a safe field whitelist", async () => {
  const [service, route, schema] = await Promise.all([
    readSource("src/services/events/events.service.ts"),
    readSource("src/app/api/admin/events/[id]/attendances/[attendanceId]/route.ts"),
    readSource("src/services/events/events.schema.ts"),
  ]);

  assert.match(service, /updateAttendanceForAdmin: async \(eventId: string, attendanceId: EventAttendanceId/);
  assert.match(service, /deleteAttendanceForAdmin: async \(eventId: string, attendanceId: EventAttendanceId/);
  assert.match(service, /current\.event_id !== eventId/);
  assert.match(route, /params: Promise<\{ id: string; attendanceId: string \}>/);
  assert.match(route, /updateAttendanceForAdmin\(id, attendanceId/);
  assert.match(route, /deleteAttendanceForAdmin\(id, attendanceId\)/);
  assert.doesNotMatch(schema, /attendanceUpdateSchema[\s\S]*user_id/);
  assert.doesNotMatch(schema, /attendanceUpdateSchema[\s\S]*event_id/);
});

test("attendance records preserve username and real name as separate administrative fields", async () => {
  const records = await readSource("src/components/(admin)/admin/events/AttendanceRecords.tsx");

  assert.match(records, /使用者名稱/);
  assert.match(records, /真實姓名/);
  assert.match(records, /尚未填寫/);
  assert.doesNotMatch(records, /profile\?\.real_name \|\| record\.user\.name/);
  assert.match(records, /刪除簽到紀錄/);
});

test("manual attendance user selection uses a server-backed search instead of a preloaded giant select", async () => {
  const actions = await readSource("src/components/(admin)/admin/events/AttendanceActions.tsx");

  assert.match(actions, /attendances\/users/);
  assert.match(actions, /搜尋使用者/);
  assert.doesNotMatch(actions, /users: User\[\]/);
  assert.doesNotMatch(actions, /users\.map/);
});
