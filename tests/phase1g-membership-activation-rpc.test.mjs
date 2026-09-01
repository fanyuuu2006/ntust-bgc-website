import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("membership-activation hotfix qualifies every table column that conflicts with RETURNS TABLE output variables", async () => {
  const sql = await readProjectFile(
    "supabase/migrations/202609010007_fix_membership_register_key_rpc_ambiguity.sql",
  );

  assert.match(sql, /from public\.academic_years as academic_year/);
  assert.match(sql, /academic_year\.id = v_key\.academic_year_id/);
  assert.match(sql, /from public\.memberships as membership/);
  assert.match(sql, /membership\.user_id = p_user_id/);
  assert.match(sql, /membership\.academic_year_id = v_key\.academic_year_id/);
  assert.match(sql, /membership\.status in \(/);
  assert.match(sql, /update public\.membership_register_keys as membership_register_key/);
  assert.match(sql, /where membership_register_key\.id = v_key\.id/);
  assert.doesNotMatch(sql, /where\s+id\s*=\s*v_key\.academic_year_id/);
  assert.doesNotMatch(sql, /where\s+id\s*=\s*v_key\.id/);
});

test("current remote canonical snapshot records the deployed ambiguity fix", async () => {
  const schema = await readProjectFile("supabase/schema/canonical-public-schema.sql");

  assert.match(
    schema,
    /academic_year\.id = v_key\.academic_year_id and academic_year\.is_current = true/,
  );
  assert.match(
    schema,
    /membership_register_key\.id = v_key\.id/,
  );
  assert.doesNotMatch(
    schema,
    /from public\.academic_years where id = v_key\.academic_year_id/,
  );
});
