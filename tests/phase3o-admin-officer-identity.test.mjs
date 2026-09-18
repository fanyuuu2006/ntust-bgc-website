import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("admin identity presents real name first and keeps the public username secondary", () => {
  const { AdminUserIdentity } = load(
    "src/components/(admin)/admin/users/AdminUserIdentity.tsx",
  );
  const html = renderToStaticMarkup(
    createElement(AdminUserIdentity, {
      identity: {
        name: "public-handle",
        real_name: "王小明",
        student_id: "B11234567",
        email: "member@example.invalid",
        closed_at: null,
      },
      disambiguation: "studentId",
    }),
  );

  assert.ok(html.indexOf("王小明") < html.indexOf("public-handle"));
  assert.match(html, /B11234567/);
  assert.match(html, /title="public-handle"/);
});

test("admin identity falls back safely when profile identity is unavailable", () => {
  const { AdminUserIdentity } = load(
    "src/components/(admin)/admin/users/AdminUserIdentity.tsx",
  );
  const html = renderToStaticMarkup(
    createElement(AdminUserIdentity, {
      identity: {
        name: "public-only",
        real_name: null,
        student_id: null,
        email: "member@example.invalid",
        closed_at: null,
      },
    }),
  );

  assert.match(html, /public-only/);
  assert.match(html, /未填寫真實姓名/);
  assert.doesNotMatch(html, /undefined|null/);
});

test("admin identity marks closed accounts and bounds long identity text", () => {
  const { AdminUserIdentity } = load(
    "src/components/(admin)/admin/users/AdminUserIdentity.tsx",
  );
  const longName = "very-long-public-username-".repeat(8);
  const html = renderToStaticMarkup(
    createElement(AdminUserIdentity, {
      identity: {
        name: longName,
        real_name: "保留的真實姓名",
        student_id: null,
        email: "member@example.invalid",
        closed_at: "2026-09-18T00:00:00Z",
      },
      variant: "mobile",
    }),
  );

  assert.match(html, /帳號已關閉/);
  assert.match(html, /min-w-0/);
  assert.match(html, /line-clamp-2|wrap-anywhere/);
  assert.match(html, new RegExp(`title="${longName}"`));
});

test("officer search expands all identity fields before one paginated officer query", async () => {
  const calls = [];
  const officerResult = { data: [], total: 0, totalPages: 0, page: 3, pageSize: 20 };
  const { officerPositionsService } = load(
    "src/services/officer-positions/officer-positions.service.ts",
    {
      "@/repositories/officer-positions.repository": {
        officerPositionsRepository: {
          findMany: async (options) => {
            calls.push(["officers", options]);
            return officerResult;
          },
        },
      },
      "@/repositories/users.repository": {
        usersRepository: {
          findIdsBySearch: async (search) => {
            calls.push(["users-search", search]);
            return ["11111111-1111-4111-8111-111111111111"];
          },
          findAdminIdentitiesByIds: async () => [],
        },
      },
      "@/repositories/user-profiles.repository": {
        userProfilesRepository: {
          findUserIdsBySearch: async (search) => {
            calls.push(["profiles-search", search]);
            return ["22222222-2222-4222-8222-222222222222"];
          },
          findAdminIdentitiesByUserIds: async () => [],
        },
      },
      "@/repositories/academic-years.repository": {
        academicYearsRepository: { findManyByIds: async () => [] },
      },
    },
  );

  await officerPositionsService.listForAdmin({
    search: " Alice ",
    academicYearId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    page: 3,
    pageSize: 20,
    orderDirection: "asc",
  });

  assert.deepEqual(calls.slice(0, 2), [
    ["users-search", "Alice"],
    ["profiles-search", "Alice"],
  ]);
  assert.deepEqual(calls[2], [
    "officers",
    {
      search: "Alice",
      matchedUserIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      academicYearId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      page: 3,
      pageSize: 20,
      orderDirection: "asc",
    },
  ]);
});

test("zero identity matches stay a safe title-only officer search", async () => {
  const received = [];
  const { officerPositionsService } = load(
    "src/services/officer-positions/officer-positions.service.ts",
    {
      "@/repositories/officer-positions.repository": {
        officerPositionsRepository: {
          findMany: async (options) => {
            received.push(options);
            return { data: [], total: 0, totalPages: 0, page: 1, pageSize: 20 };
          },
        },
      },
      "@/repositories/users.repository": {
        usersRepository: {
          findIdsBySearch: async () => [],
          findAdminIdentitiesByIds: async () => [],
        },
      },
      "@/repositories/user-profiles.repository": {
        userProfilesRepository: {
          findUserIdsBySearch: async () => [],
          findAdminIdentitiesByUserIds: async () => [],
        },
      },
      "@/repositories/academic-years.repository": {
        academicYearsRepository: { findManyByIds: async () => [] },
      },
    },
  );

  await officerPositionsService.listForAdmin({ search: "社長" });
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], { search: "社長", matchedUserIds: [] });
});

test("officer repository keeps filter, title-or-identity, count, sort and pagination in one query", async () => {
  const calls = [];
  const builder = {
    select(columns, options) {
      calls.push(["select", columns, options]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    or(expression) {
      calls.push(["or", expression]);
      return this;
    },
    order(column, options) {
      calls.push(["order", column, options]);
      return this;
    },
    range(from, to) {
      calls.push(["range", from, to]);
      return Promise.resolve({ data: [], error: null, count: 0 });
    },
  };
  const { officerPositionsRepository } = load(
    "src/repositories/officer-positions.repository.ts",
    {
      "@/libs/supabase/server": {
        supabase: {
          from(table) {
            assert.equal(table, "officer_positions");
            return builder;
          },
        },
      },
    },
  );

  await officerPositionsRepository.findMany({
    search: "社長%_",
    matchedUserIds: ["11111111-1111-4111-8111-111111111111"],
    academicYearId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    page: 2,
    pageSize: 10,
    orderDirection: "asc",
  });

  assert.deepEqual(calls[0], ["select", "*", { count: "exact" }]);
  assert.deepEqual(calls[1], [
    "eq",
    "academic_year_id",
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  ]);
  assert.equal(calls.filter(([name]) => name === "or").length, 1);
  assert.match(calls.find(([name]) => name === "or")[1], /title\.ilike/);
  assert.match(calls.find(([name]) => name === "or")[1], /user_id\.in/);
  assert.deepEqual(calls.at(-2), ["order", "created_at", { ascending: true }]);
  assert.deepEqual(calls.at(-1), ["range", 10, 19]);
});

test("officer page keeps URL-authoritative search and public identity stays private-safe", async () => {
  const [page, publicIdentity] = await Promise.all([
    readSource("src/app/(admin)/admin/officers/page.tsx"),
    readSource("src/services/users/public-identity.service.ts"),
  ]);

  assert.match(page, /search:\s*params\.search\?\.trim\(\) \|\| undefined/);
  assert.doesNotMatch(page, /titleSearch:/);
  assert.doesNotMatch(publicIdentity, /real_name|student_id|email/);
});
