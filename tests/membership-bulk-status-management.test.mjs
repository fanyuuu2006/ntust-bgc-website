import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ZodError } from "zod";

import { load } from "./helpers/load-app-module.mjs";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const YEAR_ID = "00000000-0000-4000-8000-000000000010";
const OTHER_YEAR_ID = "00000000-0000-4000-8000-000000000011";
const RECORDS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    expected_status: "pending",
    expected_academic_year_id: YEAR_ID,
    expected_updated_at: "2026-10-15T10:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    expected_status: "suspended",
    expected_academic_year_id: YEAR_ID,
    expected_updated_at: "2026-10-15T10:05:00.000Z",
  },
];

test("membership batch schema accepts existing statuses and rejects unsafe batches", () => {
  const { bulkUpdateMembershipStatusSchema } = load(
    "src/services/memberships/memberships.schema.ts",
  );

  assert.equal(
    bulkUpdateMembershipStatusSchema.safeParse({
      action: "set-status",
      status: "active",
      records: RECORDS,
    }).success,
    true,
  );

  for (const input of [
    { action: "set-status", status: "active", records: [] },
    {
      action: "set-status",
      status: "active",
      records: [RECORDS[0], RECORDS[0]],
    },
    {
      action: "set-status",
      status: "active",
      records: [RECORDS[0], { ...RECORDS[1], expected_academic_year_id: OTHER_YEAR_ID }],
    },
    {
      action: "set-status",
      status: "active",
      records: [{ ...RECORDS[0], id: "invalid" }],
    },
    {
      action: "set-status",
      status: "active",
      records: Array.from({ length: 101 }, (_, index) => ({
        ...RECORDS[0],
        id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      })),
    },
  ]) {
    assert.equal(bulkUpdateMembershipStatusSchema.safeParse(input).success, false);
  }
});

test("membership transition helper preserves the single-record lifecycle", () => {
  const { canTransitionMembershipStatus } = load(
    "src/utils/membership-status.ts",
  );
  const allowed = {
    pending: ["pending", "active", "cancelled"],
    active: ["active", "suspended", "cancelled", "expired"],
    suspended: ["suspended", "active", "cancelled"],
    expired: ["expired"],
    cancelled: ["cancelled"],
  };
  const statuses = ["pending", "active", "expired", "suspended", "cancelled"];

  for (const from of statuses) {
    for (const to of statuses) {
      assert.equal(
        canTransitionMembershipStatus(from, to),
        allowed[from].includes(to),
        `${from} -> ${to}`,
      );
    }
  }
});

test("membership batch route preserves authorization and response contracts", async () => {
  const {
    MembershipBatchConflictError,
    MembershipStatusTransitionError,
  } = load("src/services/memberships/memberships.errors.ts");
  let authorization = { user: { id: "admin" }, response: null };
  let serviceError = null;
  const calls = [];
  const { PATCH } = load("src/app/api/admin/memberships/batch/route.ts", {
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
    "@/services/memberships/memberships.errors": {
      MembershipBatchConflictError,
      MembershipStatusTransitionError,
    },
    "@/services/memberships/memberships.service": {
      membershipService: {
        bulkUpdateStatusForAdmin: async (...args) => {
          calls.push(args);
          if (serviceError) throw serviceError;
          return { updatedCount: 2 };
        },
      },
    },
  });
  const input = { action: "set-status", status: "active", records: RECORDS };
  const request = { json: async () => input };

  for (const response of [
    { body: { message: "請先登入" }, status: 401 },
    {
      body: {
        message: "請先完成 Email 驗證",
        code: "EMAIL_VERIFICATION_REQUIRED",
      },
      status: 403,
    },
    { body: { message: "沒有社員資格管理權限" }, status: 403 },
  ]) {
    authorization = { user: null, response };
    assert.deepEqual(await PATCH(request), response);
  }

  authorization = { user: { id: "admin" }, response: null };
  assert.deepEqual(await PATCH(request), {
    body: { data: { updatedCount: 2 } },
    status: 200,
  });
  assert.deepEqual(calls.at(-1), [input]);

  serviceError = new ZodError([]);
  assert.equal((await PATCH(request)).status, 400);
  serviceError = new MembershipBatchConflictError();
  assert.equal((await PATCH(request)).status, 409);
  serviceError = new MembershipStatusTransitionError();
  assert.equal((await PATCH(request)).status, 409);
});

test("service and repository use one atomic RPC with stale-state input", async () => {
  const [service, repository, singleRoute] = await Promise.all([
    readSource("src/services/memberships/memberships.service.ts"),
    readSource("src/repositories/memberships.repository.ts"),
    readSource("src/app/api/admin/memberships/[id]/route.ts"),
  ]);

  assert.match(service, /bulkUpdateMembershipStatusSchema\.parse\(input\)/);
  assert.match(service, /canTransitionMembershipStatus/);
  assert.match(service, /updateManyStatusForAdmin/);
  assert.match(service, /throw new MembershipBatchConflictError/);
  assert.match(repository, /\.rpc\(\s*"update_admin_memberships_status"/s);
  assert.match(repository, /expected_status: record\.status/);
  assert.match(repository, /expected_academic_year_id: record\.academic_year_id/);
  assert.match(repository, /expected_updated_at: record\.updated_at/);
  assert.doesNotMatch(repository, /Promise\.all/);
  assert.match(singleRoute, /membershipService\.updateForAdmin/);
});

test("membership RPC locks, validates and updates as one transaction", async () => {
  const [migration, canonical, verification] = await Promise.all([
    readSource(
      "supabase/migrations/202610150002_update_memberships_status_atomically.sql",
    ),
    readSource("supabase/schema/canonical-public-schema.sql"),
    readSource("supabase/verification/verify-reproducible-schema.sql"),
  ]);
  const updateOffset = migration.indexOf("update public.memberships");

  assert.match(migration, /jsonb_array_length\(p_items\)/);
  assert.match(migration, /v_item_count > 100/);
  assert.match(migration, /count\(distinct input\.id\)/);
  assert.match(migration, /count\(distinct input\.expected_academic_year_id\)/);
  assert.match(migration, /order by membership\.id\s+for update of membership/s);
  assert.match(migration, /v_locked_count <> v_item_count/);
  assert.match(migration, /membership\.status is distinct from input\.expected_status/);
  assert.match(migration, /membership\.updated_at is distinct from input\.expected_updated_at/);
  assert.match(migration, /membership\.academic_year_id is distinct from input\.expected_academic_year_id/);
  assert.match(migration, /membership\.status = 'pending'.*p_status in \('active', 'cancelled'\)/s);
  assert.match(migration, /membership\.status = 'active'.*p_status in \('suspended', 'cancelled', 'expired'\)/s);
  assert.match(migration, /membership\.status = 'suspended'.*p_status in \('active', 'cancelled'\)/s);
  assert.ok(updateOffset > migration.indexOf("v_locked_count <> v_item_count"));
  assert.ok(updateOffset > migration.indexOf("expected_updated_at"));
  assert.match(migration, /when unique_violation then/);
  assert.match(migration, /get diagnostics v_updated_count = row_count/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all privileges[\s\S]*from public, anon, authenticated, service_role/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(canonical, /create function public\.update_admin_memberships_status/);
  assert.match(verification, /update_admin_memberships_status\(jsonb,public\.merbership_status\)/);
});

test("membership UI shares current-page selection across desktop and mobile", async () => {
  const [records, page, bulkBar] = await Promise.all([
    readSource("src/components/(admin)/admin/memberships/MembershipRecords.tsx"),
    readSource("src/app/(admin)/admin/memberships/page.tsx"),
    readSource("src/components/(admin)/admin/AdminBulkActionBar.tsx"),
  ]);

  assert.ok((records.match(/selectedIds\.has\(membership\.id\)/g) ?? []).length >= 2);
  assert.match(records, /label="選取本頁全部社員資格"/);
  assert.match(records, /selectedCount=\{selectedCount\}/);
  assert.match(records, /mobilePresentation="panel"/);
  assert.match(records, /className="w-full lg:w-auto"/);
  assert.match(records, /需先將清單篩選為單一學年度/);
  assert.match(records, /依第一筆學年度篩選/);
  assert.match(bulkBar, /已選取 \{selectedCount\} 筆/);
  assert.match(records, /selectedCount > 0 \? \(/);
  assert.doesNotMatch(records, /無合法狀態/);
  assert.match(records, /批次更新社員資格狀態/);
  assert.match(records, /expected_status: membership\.status/);
  assert.match(records, /expected_academic_year_id: membership\.academic_year_id/);
  assert.match(records, /expected_updated_at: membership\.updated_at/);
  assert.match(records, /selectedAcademicYearCount === 1/);
  assert.match(records, /clearSelection\(\)/);
  assert.match(records, /tone: "error"[\s\S]*caught instanceof Error/);
  assert.match(records, /MembershipRowActions/);
  assert.match(page, /key=\{JSON\.stringify\(\{ \.\.\.query, page, pageSize \}\)\}/);
});
