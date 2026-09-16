import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { load } from "./helpers/load-app-module.mjs";

const date = load("src/utils/date.tsx");
const schema = load("src/services/academic-years/academic-years.schema.ts");

test("Academic Year accepts strict, real date-only values", () => {
  for (const value of ["2026-09-07", "2024-02-29"]) {
    assert.equal(schema.createAcademicYearSchema.safeParse({ year: "115", start_date: value, end_date: "2027-09-05" }).success, true);
  }

  for (const value of [
    "2026-9-7",
    "2026-13-01",
    "2026-02-30",
    "2025-02-29",
    "2026-09-07T00:00:00Z",
    "September 7, 2026",
  ]) {
    assert.equal(schema.createAcademicYearSchema.safeParse({ year: "115", start_date: value, end_date: "2027-09-05" }).success, false, value);
  }
});

test("Academic Year rejects equal or reversed inclusive ranges", () => {
  for (const end_date of ["2026-09-07", "2026-09-06"]) {
    assert.equal(schema.createAcademicYearSchema.safeParse({ year: "115", start_date: "2026-09-07", end_date }).success, false);
  }
});

test("date-only formatting and arithmetic do not interpret values as instants", () => {
  assert.equal(date.formatDateOnly("2026-09-07"), "2026年9月7日");
  assert.equal(date.addDaysToDateOnly("2026-09-30", 1), "2026-10-01");
  assert.equal(date.addDaysToDateOnly("2024-02-29", 1), "2024-03-01");
  assert.equal(date.addDaysToDateOnly("2026-12-31", 1), "2027-01-01");
});

test("inclusive Academic Year dates become a Taiwan half-open instant range", () => {
  const range = date.getTaipeiDateOnlyInstantRange("2026-09-07", "2027-09-05");
  assert.deepEqual(range, {
    startInclusive: "2026-09-06T16:00:00.000Z",
    endExclusive: "2027-09-05T16:00:00.000Z",
  });
  const included = [
    "2026-09-06T16:00:00.000Z",
    "2027-09-05T12:00:00.000Z",
    "2027-09-05T15:59:59.999Z",
  ];
  for (const instant of included) {
    assert.equal(instant >= range.startInclusive && instant < range.endExclusive, true);
  }
  assert.equal("2026-09-06T15:59:59.999Z" >= range.startInclusive, false);
  assert.equal("2027-09-05T16:00:00.000Z" < range.endExclusive, false);
});

test("Admin form and list use date-only values without slicing or instant formatting", () => {
  const actions = readFileSync("src/components/(admin)/admin/academic-years/AcademicYearActions.tsx", "utf8");
  const records = readFileSync("src/components/(admin)/admin/academic-years/AcademicYearRecords.tsx", "utf8");
  assert.doesNotMatch(actions, /\.slice\(0,\s*10\)/);
  assert.match(actions, /start_date:\s*year\?\.start_date/);
  assert.match(records, /formatDateOnly\(year\.start_date\)/);
  assert.doesNotMatch(records, /formatDate\(year\.(?:start_date|end_date)\)/);
});

test("migration uses the reviewed map, exact preflight, date columns, and date RPC", () => {
  const sql = readFileSync("supabase/migrations/202609170001_normalize_academic_year_dates.sql", "utf8");
  for (const [year, start, end] of [
    ["101", "2012-09-03", "2013-09-01"],
    ["111", "2022-09-05", "2023-09-03"],
    ["112", "2023-09-04", "2024-09-01"],
    ["113", "2024-09-02", "2025-08-31"],
    ["114", "2025-09-01", "2026-09-06"],
    ["115", "2026-09-07", "2027-09-05"],
  ]) {
    assert.match(sql, new RegExp(`'${year}'[\\s\\S]*?'${start}'[\\s\\S]*?'${end}'`));
  }
  assert.match(sql, /ACADEMIC_YEAR_PREFLIGHT_MISMATCH/);
  assert.match(sql, /start_date_date date/);
  assert.match(sql, /end_date_date date/);
  assert.match(sql, /check \(start_date < end_date\)/);
  assert.match(sql, /p_start_date date/);
  assert.match(sql, /p_end_date date/);
  assert.match(sql, /recompute_membership_types_for_user/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute on function public\.update_academic_year\(uuid, text, date, date\)\s+to service_role/);
  assert.doesNotMatch(sql, /at time zone|::date\s*[,;]/i);
});

test("attendance queries the inclusive dates as a half-open instant interval", () => {
  const repository = readFileSync("src/repositories/event-attendances.repository.ts", "utf8");
  assert.match(repository, /getTaipeiDateOnlyInstantRange/);
  assert.match(repository, /\.gte\("events\.start_time", startInclusive\)/);
  assert.match(repository, /\.lt\("events\.start_time", endExclusive\)/);
  assert.doesNotMatch(repository, /\.lte\("events\.start_time", academicYear\.end_date\)/);
});

test("Academic Year consumers compare canonical date strings without Date parsing", () => {
  for (const path of [
    "src/libs/profile-presentation.ts",
    "src/services/memberships/memberships.service.ts",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /new Date\([^\n]*academic_year\.start_date/);
    assert.match(source, /start_date/);
    assert.match(source, /localeCompare/);
  }
});

test("canonical schema exposes date-only columns and RPC", () => {
  const sql = readFileSync("supabase/schema/canonical-public-schema.sql", "utf8");
  assert.match(sql, /start_date date not null/);
  assert.match(sql, /end_date date not null/);
  assert.match(sql, /constraint academic_years_date_range_check check \(start_date < end_date\)/);
  assert.match(sql, /update_academic_year\(uuid, text, date, date\)/);
  assert.doesNotMatch(sql, /update_academic_year\(uuid, text, timestamptz, timestamptz\)/);
});
