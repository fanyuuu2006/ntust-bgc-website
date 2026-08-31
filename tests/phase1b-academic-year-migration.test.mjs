import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("academic-year migration preflights and enforces at most one current year", async () => {
  const sql = await readProjectFile(
    "supabase/migrations/202609010004_enforce_academic_year_current_integrity.sql",
  );

  assert.match(sql, /current_year_count > 1/);
  assert.match(sql, /create unique index academic_years_one_current_year_idx/);
  assert.match(sql, /where is_current = true/);
  assert.match(sql, /create function public\.set_current_academic_year/);
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock/);
  assert.match(sql, /pg_catalog\.hashtext\('academic_years:set_current'\)/);
  assert.match(sql, /for update/);
  assert.match(sql, /message = 'ACADEMIC_YEAR_NOT_FOUND'/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute on function public\.set_current_academic_year\(uuid\) to service_role/);
});

test("academic-year source uses the transactional RPC and blocks current-year deletion", async () => {
  const repository = await readProjectFile(
    "src/repositories/academic-years.repository.ts",
  );
  const service = await readProjectFile(
    "src/services/academic-years/academic-years.service.ts",
  );
  const route = await readProjectFile(
    "src/app/api/admin/academic-years/[id]/route.ts",
  );

  assert.match(repository, /supabase\.rpc\("set_current_academic_year"/);
  const setCurrentSection = repository.slice(repository.indexOf("setCurrent:"));
  assert.doesNotMatch(setCurrentSection, /\.update\(\{ is_current:/);
  assert.match(service, /if \(existing\.is_current\) throw new AcademicYearCurrentDeleteForbiddenError\(\)/);
  assert.match(route, /AcademicYearCurrentDeleteForbiddenError/);
});
