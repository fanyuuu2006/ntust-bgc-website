import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const nodeRequire = createRequire(import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadCommonJsModule(path, overrides = {}) {
  const source = await readSource(path);
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  const localRequire = (specifier) => overrides[specifier] ?? nodeRequire(specifier);
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    localRequire,
  );
  return runtimeModule.exports;
}

test("Admin user verification query normalizes each scalar independently", async () => {
  const queryParams = await loadCommonJsModule("src/libs/query-params.ts");
  const schema = await loadCommonJsModule("src/app/(admin)/admin/users/query.ts", {
    "@/libs/query-params": queryParams,
    "@/repositories/users.repository": {},
  });

  assert.equal(schema.normalizeAdminUserEmailVerification("verified"), "verified");
  assert.equal(schema.normalizeAdminUserEmailVerification("unverified"), "unverified");
  assert.equal(schema.normalizeAdminUserEmailVerification("invalid"), undefined);
  assert.equal(
    schema.normalizeAdminUserEmailVerification(["verified", "unverified"]),
    "verified",
  );
  assert.equal(schema.normalizeAdminUserEmailVerification(""), undefined);
});

test("verification filter navigation preserves applied state and resets page", async () => {
  const { buildOwnedQueryHref } = await loadCommonJsModule(
    "src/libs/query-navigation.ts",
  );

  assert.equal(
    buildOwnedQueryHref({
      basePath: "/admin/users",
      appliedQuery: {
        search: "wang",
        page: "4",
        pageSize: "50",
        orderBy: "name",
        orderDirection: "asc",
      },
      ownedKeys: ["emailVerification"],
      changes: { emailVerification: "unverified" },
    }),
    "/admin/users?search=wang&page=1&pageSize=50&orderBy=name&orderDirection=asc&emailVerification=unverified",
  );
});

function createUsersQueryRecorder() {
  const calls = [];
  const builder = {
    select() {
      return this;
    },
    in() {
      return this;
    },
    or() {
      return this;
    },
    is(...args) {
      calls.push(["is", ...args]);
      return this;
    },
    not(...args) {
      calls.push(["not", ...args]);
      return this;
    },
    order() {
      return this;
    },
    range() {
      return Promise.resolve({ data: [], error: null, count: 0 });
    },
  };
  return {
    calls,
    supabase: { from: () => builder },
  };
}

async function loadUsersRepository(supabase) {
  return loadCommonJsModule("src/repositories/users.repository.ts", {
    "server-only": {},
    "@/libs/supabase/server": { supabase },
    "./shared/errors": {
      throwRepositoryError: (_context, error) => {
        throw error;
      },
    },
    "./shared/pagination": {
      normalizePaginationOptions: () => ({ page: 1, pageSize: 20, from: 0, to: 19 }),
      buildPaginationResult: (data, total, page, pageSize) => ({
        data,
        total: total ?? 0,
        page,
        pageSize,
        totalPages: 0,
      }),
    },
    "./shared/search": { buildIlikeSearch: () => "" },
  });
}

test("Admin verification filtering is executed by the users repository", async () => {
  const verified = createUsersQueryRecorder();
  const verifiedRepository = await loadUsersRepository(verified.supabase);
  await verifiedRepository.usersRepository.findMany({
    emailVerification: "verified",
  });
  assert.deepEqual(verified.calls, [
    ["not", "email_verified_at", "is", null],
  ]);

  const unverified = createUsersQueryRecorder();
  const unverifiedRepository = await loadUsersRepository(unverified.supabase);
  await unverifiedRepository.usersRepository.findMany({
    emailVerification: "unverified",
  });
  assert.deepEqual(unverified.calls, [["is", "email_verified_at", null]]);
});

test("Admin users list exposes compact verification visibility on desktop and mobile", async () => {
  const page = await readSource("src/app/(admin)/admin/users/page.tsx");

  assert.match(page, /emailVerification/);
  assert.match(page, /ImmediateQuerySelect/);
  assert.match(page, /EmailVerificationBadge/);
  assert.match(page, /user\.email_verified_at/);
  assert.match(page, /Email/);
  assert.match(page, /formatDateTime\(user\.created_at\)/);
  assert.match(page, /lg:hidden/);
  assert.match(page, /hidden lg:block/);
  assert.match(page, /QueryEmptyState/);
});

test("Admin user detail reports verification state without token infrastructure", async () => {
  const page = await readSource("src/app/(admin)/admin/users/[id]/page.tsx");

  assert.match(page, /EmailVerificationBadge/);
  assert.match(page, /email_verified_at/);
  assert.match(page, /formatDateTime\(user\.email_verified_at\)/);
  assert.doesNotMatch(
    page,
    /token_hash|verification_tokens|consumed_at|expires_at|Brevo|provider/i,
  );
});

test("Phase 3A remains read-only and keeps verification separate from membership and officer domains", async () => {
  const [page, detail, service, repository, pickerTypes, picker] =
    await Promise.all([
      readSource("src/app/(admin)/admin/users/page.tsx"),
      readSource("src/app/(admin)/admin/users/[id]/page.tsx"),
      readSource("src/services/users/users.service.tsx"),
      readSource("src/repositories/users.repository.ts"),
      readSource("src/services/users/users.types.ts"),
      readSource("src/components/(admin)/admin/users/AdminUserPicker.tsx"),
    ]);

  const listForAdmin = service.slice(
    service.indexOf("listForAdmin"),
    service.indexOf("getUserForAdmin"),
  );
  assert.doesNotMatch(listForAdmin, /membershipService|officerPositionsService/);
  assert.match(
    repository,
    /type UpdateUserInput = Partial<Pick<User, "name" \| "avatar">>/,
  );
  const updateById = repository.slice(
    repository.indexOf("updateById"),
    repository.indexOf("deleteById"),
  );
  assert.doesNotMatch(updateById, /email_verified_at/);
  assert.doesNotMatch(`${page}\n${detail}`, /標記為已驗證|重新寄送驗證信/);
  assert.doesNotMatch(`${page}\n${detail}`, /email_verification_tokens|token_hash/);
  assert.doesNotMatch(`${pickerTypes}\n${picker}`, /emailVerified|email_verified_at/);
});
