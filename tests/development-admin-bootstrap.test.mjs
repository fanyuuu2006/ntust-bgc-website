import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  bootstrapDevelopmentAdmin,
  parseBootstrapInput,
  parseDevelopmentTarget,
} from "../scripts/bootstrap-development-admin.mjs";

const input = { email: "admin@example.test", year: "115", startDate: "2026-08-01", endDate: "2027-07-31", title: "Development Officer" };

function fakeAdapter(overrides = {}) {
  const calls = [];
  return {
    calls,
    findUserByEmail: async () => ({ id: "user-1", email_verified_at: null, closed_at: null }),
    findAcademicYearByIdentifier: async () => null,
    findOfficerPositions: async () => [],
    verifyUserCanonically: async () => { calls.push("verify"); },
    createAcademicYear: async () => { calls.push("year"); return { id: "year-1", year: "115", start_date: input.startDate, end_date: input.endDate }; },
    createOfficerPosition: async () => { calls.push("officer-rpc"); },
    ...overrides,
  };
}

test("target safety accepts only the exact hosted Development project", () => {
  assert.equal(parseDevelopmentTarget("https://mrsyfssstigartmhofuz.supabase.co"), "mrsyfssstigartmhofuz");
  for (const unsafe of ["https://gcydchpuckbmctcjpokz.supabase.co", "https://unknown.supabase.co", "http://localhost:54321", "not-a-url", "https://mrsyfssstigartmhofuz.supabase.co/path"]) {
    assert.throws(() => parseDevelopmentTarget(unsafe));
  }
});

test("confirmation and canonical input validation fail before any write", async () => {
  const adapter = fakeAdapter();
  await assert.rejects(() => bootstrapDevelopmentAdmin(input, adapter), /confirm-development/);
  for (const invalid of [{ ...input, startDate: "2026-02-30" }, { ...input, endDate: input.startDate }, { ...input, year: "2026" }]) {
    assert.throws(() => parseBootstrapInput(invalid));
  }
  assert.deepEqual(adapter.calls, []);
});

test("missing and closed users are rejected without mutation", async () => {
  for (const user of [null, { id: "user-1", email_verified_at: null, closed_at: "2026-01-01T00:00:00Z" }]) {
    const adapter = fakeAdapter({ findUserByEmail: async () => user });
    await assert.rejects(() => bootstrapDevelopmentAdmin(input, adapter, { confirmDevelopment: true }));
    assert.deepEqual(adapter.calls, []);
  }
});

test("unverified account uses canonical verification then canonical mutations", async () => {
  const adapter = fakeAdapter();
  const result = await bootstrapDevelopmentAdmin(input, adapter, { confirmDevelopment: true });
  assert.deepEqual(adapter.calls, ["verify", "year", "officer-rpc"]);
  assert.deepEqual(result.plan, { verifyUser: true, createAcademicYear: true, createOfficerPosition: true });
});

test("existing exact state is idempotent and conflicting Academic Year fails closed", async () => {
  const exactYear = { id: "year-1", year: "115", start_date: input.startDate, end_date: input.endDate };
  const exact = fakeAdapter({
    findUserByEmail: async () => ({ id: "user-1", email_verified_at: "2026-01-01T00:00:00Z", closed_at: null }),
    findAcademicYearByIdentifier: async () => exactYear,
    findOfficerPositions: async () => [{ id: "officer-1", title: input.title }],
  });
  const first = await bootstrapDevelopmentAdmin(input, exact, { confirmDevelopment: true });
  assert.deepEqual(first.plan, { verifyUser: false, createAcademicYear: false, createOfficerPosition: false });
  assert.deepEqual(exact.calls, []);

  const conflicting = fakeAdapter({ findAcademicYearByIdentifier: async () => ({ ...exactYear, end_date: "2027-06-30" }) });
  await assert.rejects(() => bootstrapDevelopmentAdmin(input, conflicting, { confirmDevelopment: true }), /conflicting dates/);
  assert.deepEqual(conflicting.calls, []);
});

test("dry-run inspects state and performs zero writes", async () => {
  const adapter = fakeAdapter();
  const result = await bootstrapDevelopmentAdmin(input, adapter, { confirmDevelopment: true, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.deepEqual(adapter.calls, []);
});

test("different existing officer titles do not bypass canonical create RPC", async () => {
  const adapter = fakeAdapter({
    findAcademicYearByIdentifier: async () => ({ id: "year-1", year: "115", start_date: input.startDate, end_date: input.endDate }),
    findOfficerPositions: async () => [{ id: "officer-1", title: "Another Position" }],
  });
  await bootstrapDevelopmentAdmin(input, adapter, { confirmDevelopment: true });
  assert.deepEqual(adapter.calls, ["verify", "officer-rpc"]);
});

test("a completed bootstrap is safe to repeat", async () => {
  const state = {
    user: { id: "user-1", email_verified_at: null, closed_at: null },
    academicYear: null,
    positions: [],
  };
  const calls = [];
  const adapter = {
    findUserByEmail: async () => state.user,
    findAcademicYearByIdentifier: async () => state.academicYear,
    findOfficerPositions: async () => state.positions,
    verifyUserCanonically: async () => {
      calls.push("verify");
      state.user.email_verified_at = "2026-09-19T00:00:00Z";
    },
    createAcademicYear: async (payload) => {
      calls.push("year");
      state.academicYear = { id: "year-1", ...payload };
      return state.academicYear;
    },
    createOfficerPosition: async ({ title }) => {
      calls.push("officer-rpc");
      state.positions.push({ id: "officer-1", title });
    },
  };

  await bootstrapDevelopmentAdmin(input, adapter, { confirmDevelopment: true });
  const repeated = await bootstrapDevelopmentAdmin(input, adapter, { confirmDevelopment: true });

  assert.deepEqual(calls, ["verify", "year", "officer-rpc"]);
  assert.deepEqual(repeated.plan, {
    verifyUser: false,
    createAcademicYear: false,
    createOfficerPosition: false,
  });
});

test("Supabase adapter keeps Officer writes on the canonical RPC and creates no auth-domain records", async () => {
  const source = await readFile(new URL("../scripts/bootstrap-development-admin.mjs", import.meta.url), "utf8");

  assert.match(source, /\.rpc\("create_officer_position"/);
  assert.doesNotMatch(source, /\.from\("officer_positions"\)\.insert/);
  assert.doesNotMatch(source, /\.from\("sessions"\)/);
  assert.doesNotMatch(source, /\.from\("memberships"\)/);
  assert.doesNotMatch(source, /\.from\("auth_credentials"\)/);
  assert.doesNotMatch(source, /\.from\("user_profiles"\)/);
});
