import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "./helpers/load-app-module.mjs";
import { ZodError } from "zod";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const VALID_IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
];

test("bulk revoke input rejects empty, duplicate, invalid and oversized ID sets", () => {
  const { bulkRevokeMembershipRegisterKeysSchema } = load(
    "src/services/memberships/memberships.schema.ts",
  );

  assert.equal(
    bulkRevokeMembershipRegisterKeysSchema.safeParse({
      action: "revoke",
      ids: VALID_IDS,
    }).success,
    true,
  );
  assert.equal(
    bulkRevokeMembershipRegisterKeysSchema.safeParse({
      action: "revoke",
      ids: [],
    }).success,
    false,
  );
  assert.equal(
    bulkRevokeMembershipRegisterKeysSchema.safeParse({
      action: "revoke",
      ids: [VALID_IDS[0], VALID_IDS[0]],
    }).success,
    false,
  );
  assert.equal(
    bulkRevokeMembershipRegisterKeysSchema.safeParse({
      action: "revoke",
      ids: ["not-a-uuid"],
    }).success,
    false,
  );
  assert.equal(
    bulkRevokeMembershipRegisterKeysSchema.safeParse({
      action: "revoke",
      ids: Array.from({ length: 101 }, (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      ),
    }).success,
    false,
  );
});

test("batch route preserves Admin authorization and API response contracts", async () => {
  const route = await readSource(
    "src/app/api/admin/members/register-keys/batch/route.ts",
  );

  assert.match(route, /authorizeAdminRequest\(/);
  assert.match(route, /membershipService\.bulkRevokeRegisterKeys\(/);
  assert.match(route, /NextResponse\.json\(\{ data \}\)/);
  assert.match(route, /instanceof ZodError/);
  assert.match(route, /status: 400/);
  assert.match(route, /MembershipRegisterKeysBatchConflictError/);
  assert.match(route, /status: 409/);
  assert.doesNotMatch(route, /actor|user\.id|created_by_user_id/);
});

test("batch route preserves 401, verification 403, Admin success, validation and conflict responses", async () => {
  const { MembershipRegisterKeysBatchConflictError } = load(
    "src/services/memberships/memberships.errors.ts",
  );
  let authorization = { user: { id: "admin-1" }, response: null };
  let serviceResult = { revokedCount: 2 };
  let serviceError = null;
  const { PATCH } = load(
    "src/app/api/admin/members/register-keys/batch/route.ts",
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
      "@/services/memberships/memberships.errors": {
        MembershipRegisterKeysBatchConflictError,
      },
      "@/services/memberships/memberships.service": {
        membershipService: {
          bulkRevokeRegisterKeys: async () => {
            if (serviceError) throw serviceError;
            return serviceResult;
          },
        },
      },
    },
  );
  const request = { json: async () => ({ action: "revoke", ids: VALID_IDS }) };

  for (const response of [
    { body: { message: "請先登入" }, status: 401 },
    {
      body: {
        message: "請先驗證 Email 地址",
        code: "EMAIL_VERIFICATION_REQUIRED",
      },
      status: 403,
    },
    { body: { message: "您沒有管理社員註冊序號的權限" }, status: 403 },
  ]) {
    authorization = { user: null, response };
    assert.deepEqual(await PATCH(request), response);
  }

  authorization = { user: { id: "admin-1" }, response: null };
  assert.deepEqual(await PATCH(request), {
    body: { data: serviceResult },
    status: 200,
  });

  serviceError = new ZodError([]);
  assert.deepEqual(await PATCH(request), {
    body: { message: "輸入資料格式不正確", errors: { errors: [] } },
    status: 400,
  });

  serviceError = new MembershipRegisterKeysBatchConflictError();
  assert.deepEqual(await PATCH(request), {
    body: { message: serviceError.message },
    status: 409,
  });
});

test("service owns validation and maps an atomic conflict to a domain error", async () => {
  const [service, repository] = await Promise.all([
    readSource("src/services/memberships/memberships.service.ts"),
    readSource("src/repositories/membership-register-keys.repository.ts"),
  ]);

  assert.match(service, /bulkRevokeMembershipRegisterKeysSchema\.parse\(input\)/);
  assert.match(service, /membershipRegisterKeysRepository\.revokeAvailableByIds/);
  assert.match(service, /throw new MembershipRegisterKeysBatchConflictError/);
  assert.match(repository, /\.rpc\(\s*"revoke_membership_register_keys"/s);
  assert.match(repository, /p_ids: ids/);
  assert.doesNotMatch(repository, /Promise\.all/);
});

test("RPC locks every target deterministically and updates only after full validation", async () => {
  const migration = await readSource(
    "supabase/migrations/202610140001_revoke_membership_register_keys_atomically.sql",
  );
  const canonical = await readSource("supabase/schema/canonical-public-schema.sql");
  const verification = await readSource(
    "supabase/verification/verify-reproducible-schema.sql",
  );
  const validationEnd = migration.indexOf("update public.membership_register_keys");

  assert.match(migration, /cardinality\(p_ids\) < 1/);
  assert.match(migration, /cardinality\(p_ids\) > 100/);
  assert.match(migration, /count\(distinct input\.id\)/);
  assert.match(migration, /order by register_key\.id\s+for update/s);
  assert.match(migration, /v_locked_count <> cardinality\(p_ids\)/);
  assert.match(
    migration,
    /register_key\.status <> 'available'::public\.membership_register_key_status/,
  );
  assert.ok(validationEnd > migration.indexOf("v_locked_count <>"));
  assert.ok(validationEnd > migration.indexOf("register_key.status <>"));
  assert.match(migration, /get diagnostics v_updated_count = row_count/);
  assert.match(migration, /v_updated_count <> cardinality\(p_ids\)/);
  assert.match(migration, /raise exception/);
  assert.match(migration, /set search_path = ''/);
  assert.match(
    migration,
    /revoke all privileges[\s\S]*from public, anon, authenticated, service_role/,
  );
  assert.match(
    migration,
    /grant execute[\s\S]*revoke_membership_register_keys\(uuid\[\]\)[\s\S]*to service_role/,
  );
  assert.match(canonical, /create function public\.revoke_membership_register_keys/);
  assert.match(verification, /revoke_membership_register_keys\(uuid\[\]\)/);
});

test("single-key revoke remains available beside the atomic batch RPC", async () => {
  const [route, repository, table] = await Promise.all([
    readSource("src/app/api/admin/members/register-keys/[id]/route.ts"),
    readSource("src/repositories/membership-register-keys.repository.ts"),
    readSource(
      "src/components/(admin)/admin/memberships/RegisterKeyTable.tsx",
    ),
  ]);

  assert.match(route, /membershipService\.revokeRegisterKey/);
  assert.match(repository, /revokeAvailableById/);
  assert.match(table, /pendingRevocation/);
  assert.match(table, /批次撤銷/);
});
