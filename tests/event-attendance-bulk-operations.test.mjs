import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ZodError } from "zod";

import { load } from "./helpers/load-app-module.mjs";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const records = [
  {
    id: 11,
    expected_status: "present",
    expected_attended_at: "2026-10-15T10:00:00.000Z",
  },
  {
    id: 12,
    expected_status: "late",
    expected_attended_at: "2026-10-15T10:15:00.000Z",
  },
];

test("bulk attendance input uses only the existing statuses and rejects unsafe batches", () => {
  const { bulkAttendanceUpdateSchema } = load(
    "src/services/events/events.schema.ts",
  );

  for (const status of ["present", "late", "absent"]) {
    assert.equal(
      bulkAttendanceUpdateSchema.safeParse({
        action: "set-status",
        status,
        records,
      }).success,
      true,
    );
  }
  for (const input of [
    { action: "set-status", status: "present", records: [] },
    {
      action: "set-status",
      status: "present",
      records: [records[0], records[0]],
    },
    {
      action: "set-status",
      status: "checked-in",
      records,
    },
    {
      action: "set-status",
      status: "present",
      records: [{ ...records[0], id: 0 }],
    },
    {
      action: "set-status",
      status: "present",
      records: Array.from({ length: 101 }, (_, index) => ({
        ...records[0],
        id: index + 1,
      })),
    },
  ]) {
    assert.equal(bulkAttendanceUpdateSchema.safeParse(input).success, false);
  }
});

test("batch route preserves authorization, validation, conflict, and success contracts", async () => {
  const { AttendanceBatchConflictError } = load(
    "src/services/events/events.errors.ts",
  );
  let authorization = { user: { id: "admin" }, response: null };
  let serviceError = null;
  const calls = [];
  const { PATCH } = load(
    "src/app/api/admin/events/[id]/attendances/batch/route.ts",
    {
      "next/server": {
        NextResponse: {
          json: (body, init = {}) => ({ body, status: init.status ?? 200 }),
        },
      },
      "@/libs/api/admin-authorization": {
        authorizeAdminRequest: async () => authorization,
      },
      "@/libs/api/server-response": {
        unexpectedErrorResponse: (_context, _error, message) => ({
          body: { message },
          status: 500,
        }),
      },
      "@/services/events/events.errors": { AttendanceBatchConflictError },
      "@/services/events/events.service": {
        eventsService: {
          bulkUpdateAttendancesForAdmin: async (...args) => {
            calls.push(args);
            if (serviceError) throw serviceError;
            return { updatedCount: 2 };
          },
        },
      },
    },
  );
  const input = { action: "set-status", status: "absent", records };
  const request = { json: async () => input };
  const context = { params: Promise.resolve({ id: "event-1" }) };

  for (const response of [
    { body: { message: "請先登入" }, status: 401 },
    {
      body: {
        message: "請先完成 Email 驗證",
        code: "EMAIL_VERIFICATION_REQUIRED",
      },
      status: 403,
    },
    { body: { message: "沒有管理權限" }, status: 403 },
  ]) {
    authorization = { user: null, response };
    assert.deepEqual(await PATCH(request, context), response);
  }

  authorization = { user: { id: "admin" }, response: null };
  assert.deepEqual(await PATCH(request, context), {
    body: { data: { updatedCount: 2 } },
    status: 200,
  });
  assert.deepEqual(calls.at(-1), ["event-1", input]);

  serviceError = new ZodError([]);
  assert.equal((await PATCH(request, context)).status, 400);
  serviceError = new AttendanceBatchConflictError();
  assert.deepEqual(await PATCH(request, context), {
    body: { message: serviceError.message },
    status: 409,
  });
});

test("service validates expected state and maps atomic conflicts without per-row writes", async () => {
  const service = await readSource("src/services/events/events.service.ts");
  const repository = await readSource(
    "src/repositories/event-attendances.repository.ts",
  );

  assert.match(service, /bulkAttendanceUpdateSchema\.parse\(input\)/);
  assert.match(service, /updateManyStatusForEvent/);
  assert.match(service, /throw new AttendanceBatchConflictError/);
  assert.match(repository, /\.rpc\(\s*"update_event_attendances_status"/s);
  assert.match(repository, /expected_status: record\.status/);
  assert.match(repository, /expected_attended_at: record\.attended_at/);
  assert.doesNotMatch(repository, /Promise\.all/);
});

test("attendance RPC enforces same-event locks, stale-state checks, and atomic rollback", async () => {
  const migration = await readSource(
    "supabase/migrations/202610150001_update_event_attendances_atomically.sql",
  );
  const canonical = await readSource("supabase/schema/canonical-public-schema.sql");
  const verification = await readSource(
    "supabase/verification/verify-reproducible-schema.sql",
  );
  const updateOffset = migration.indexOf("update public.event_attendances");

  assert.match(migration, /jsonb_array_length\(p_items\)/);
  assert.match(migration, /v_item_count > 100/);
  assert.match(migration, /count\(distinct input\.id\)/);
  assert.match(migration, /attendance\.event_id = p_event_id/);
  assert.match(migration, /order by attendance\.id\s+for update of attendance/s);
  assert.match(migration, /v_locked_count <> v_item_count/);
  assert.match(migration, /attendance\.status is distinct from input\.expected_status/);
  assert.match(
    migration,
    /attendance\.attended_at is distinct from input\.expected_attended_at/,
  );
  assert.ok(updateOffset > migration.indexOf("v_locked_count <> v_item_count"));
  assert.ok(updateOffset > migration.indexOf("expected_attended_at"));
  assert.match(migration, /when p_status = 'absent'.*then null/s);
  assert.match(migration, /coalesce\(attendance\.attended_at, v_now\)/);
  assert.match(migration, /get diagnostics v_updated_count = row_count/);
  assert.match(migration, /raise exception/);
  assert.match(migration, /set search_path = ''/);
  assert.match(
    migration,
    /revoke all privileges[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(canonical, /create function public\.update_event_attendances_status/);
  assert.match(verification, /update_event_attendances_status/);
});

test("attendance UI shares selection across desktop and mobile and retains single-record actions", async () => {
  const [recordsSource, page, singleRoute, bulkBar] = await Promise.all([
    readSource("src/components/(admin)/admin/events/AttendanceRecords.tsx"),
    readSource("src/app/(admin)/admin/events/[id]/page.tsx"),
    readSource(
      "src/app/api/admin/events/[id]/attendances/[attendanceId]/route.ts",
    ),
    readSource("src/components/(admin)/admin/AdminBulkActionBar.tsx"),
  ]);

  assert.match(recordsSource, /selectedIds\.has\(record\.id\)/g);
  assert.match(recordsSource, /選取目前頁面的所有簽到紀錄/);
  assert.match(recordsSource, /selectedCount=\{selectedCount\}/);
  assert.match(bulkBar, /已選取 \{selectedCount\} 筆/);
  assert.match(recordsSource, /selectedCount > 0 \? \(/);
  assert.match(recordsSource, /批次更新簽到狀態/);
  assert.match(recordsSource, /expected_status: record\.status/);
  assert.match(recordsSource, /expected_attended_at: record\.attended_at/);
  assert.match(recordsSource, /setSelectedIds\(new Set\(\)\)/);
  assert.match(recordsSource, /tone: "error"[\s\S]*caught instanceof Error/);
  assert.match(recordsSource, /<FormFeedback[\s\S]*bulkFeedback/);
  assert.match(recordsSource, /AttendanceRowActions/);
  assert.match(recordsSource, /openEditDialog/);
  assert.match(recordsSource, /openDeleteDialog/);
  assert.match(page, /key=\{JSON\.stringify\(\{ search: query\.search, orderDirection, page, pageSize \}\)\}/);
  assert.match(singleRoute, /updateAttendanceForAdmin/);
  assert.match(singleRoute, /deleteAttendanceForAdmin/);
});
