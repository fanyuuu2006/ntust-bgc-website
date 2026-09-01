import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("membership migration derives type from officer history and replaces the cross-year lifetime uniqueness", async () => {
  const sql = await readProjectFile(
    "supabase/migrations/202609010005_align_membership_type_with_officer_history.sql",
  );

  assert.match(sql, /drop index public\.memberships_one_active_lifetime_idx/);
  assert.match(sql, /create unique index memberships_one_open_per_user_year_idx/);
  assert.match(sql, /user_id, academic_year_id/);
  assert.match(
    sql,
    /status in \(\s*'pending'::public\.merbership_status,\s*'active'::public\.merbership_status,\s*'suspended'::public\.merbership_status\s*\)/,
  );
  assert.match(sql, /create function public\.recompute_membership_types_for_user/);
  assert.match(sql, /officer_year\.start_date <= membership_year\.start_date/);
  assert.match(sql, /create or replace function public\.claim_membership_register_key/);
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock/);
  assert.match(sql, /'lifetime'::public\.merbership_type/);
  assert.match(sql, /grant execute on function public\.claim_membership_register_key\(text, uuid\) to service_role/);
  assert.doesNotMatch(sql, /already_lifetime_member/);
});

test("officer mutation migration is transactional, serialized per user, and recomputes persisted membership type", async () => {
  const sql = await readProjectFile(
    "supabase/migrations/202609010006_sync_officer_positions_with_memberships.sql",
  );

  for (const name of [
    "create_officer_position",
    "update_officer_position",
    "delete_officer_position",
  ]) {
    assert.match(sql, new RegExp(`create function public\\.${name}`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}`));
  }
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock/);
  assert.match(sql, /public\.recompute_membership_types_for_user/);
  assert.match(sql, /for update/);
  assert.match(sql, /set search_path = ''/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*\b(?:anon|authenticated)\b/);
});

test("membership and officer source route all derived-type mutations through their transactional RPCs", async () => {
  const membershipRepository = await readProjectFile(
    "src/repositories/memberships.repository.ts",
  );
  const officerRepository = await readProjectFile(
    "src/repositories/officer-positions.repository.ts",
  );
  const membershipService = await readProjectFile(
    "src/services/memberships/memberships.service.ts",
  );

  assert.match(membershipRepository, /supabase\.rpc\("create_admin_membership"/);
  assert.match(membershipRepository, /supabase\.rpc\("update_admin_membership"/);
  assert.match(officerRepository, /supabase\.rpc\("create_officer_position"/);
  assert.match(officerRepository, /supabase\.rpc\("update_officer_position"/);
  assert.match(officerRepository, /supabase\.rpc\("delete_officer_position"/);
  assert.doesNotMatch(membershipService, /findActiveLifetimeByUserId/);
});

test("membership UI displays derived types but never lets an administrator choose them", async () => {
  const createButton = await readProjectFile(
    "src/components/(admin)/admin/memberships/MembershipCreateButton.tsx",
  );
  const records = await readProjectFile(
    "src/components/(admin)/admin/memberships/MembershipRecords.tsx",
  );
  const labels = await readProjectFile(
    "src/components/(admin)/admin/memberships/MemberStatusBadge.tsx",
  );

  assert.doesNotMatch(createButton, /membership-type/);
  assert.doesNotMatch(records, /id="membership-type"/);
  assert.match(labels, /一般社員/);
  assert.match(labels, /終生社員/);
  assert.doesNotMatch(labels, /年度社員|永久社員/);
});

test("membership type remains separate from current-member and admin authorization decisions", async () => {
  const membershipTypes = await readProjectFile(
    "src/services/memberships/memberships.types.ts",
  );
  const officerService = await readProjectFile(
    "src/services/officer-positions/officer-positions.service.ts",
  );

  assert.match(membershipTypes, /return qualification === "current_member"/);
  assert.doesNotMatch(membershipTypes, /qualification === "lifetime_member"/);
  assert.match(
    officerService,
    /hasEverBeenOfficer: async \(userId: UUID\): Promise<boolean> => \{\s*return await officerPositionsRepository\.existsByUserId\(userId\);/,
  );
});
