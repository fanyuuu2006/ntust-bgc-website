import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadCommonJs(path, overrides) {
  const source = await readSource(path);
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    (specifier) => {
      if (specifier in overrides) return overrides[specifier];
      throw new Error(`Unexpected dependency in ${path}: ${specifier}`);
    },
  );
  return runtimeModule.exports;
}

test("Admin authorization preserves anonymous and unverified responses before the Admin lookup", async () => {
  for (const response of [
    { body: { message: "請先登入" }, status: 401 },
    {
      body: {
        message: "請先驗證 Email 地址",
        code: "EMAIL_VERIFICATION_REQUIRED",
      },
      status: 403,
    },
  ]) {
    let adminChecks = 0;
    const { authorizeAdminRequest } = await loadCommonJs(
      "src/libs/api/admin-authorization.ts",
      {
        "next/server": { NextResponse: { json: (body, init) => ({ body, status: init.status }) } },
        "./verified-authorization": {
          authorizeVerifiedRequest: async () => ({ user: null, response }),
        },
        "@/libs/auth": {
          isAdminByUserId: async () => {
            adminChecks += 1;
            return false;
          },
        },
      },
    );

    assert.deepEqual(await authorizeAdminRequest("沒有管理權限"), {
      user: null,
      response,
    });
    assert.equal(adminChecks, 0);
  }
});

test("Admin authorization preserves the route-specific 403 and authorized user contract", async () => {
  const user = { id: "admin-1", email_verified_at: "2026-10-12T00:00:00Z" };
  let isAdmin = false;
  const { authorizeAdminRequest } = await loadCommonJs(
    "src/libs/api/admin-authorization.ts",
    {
      "next/server": { NextResponse: { json: (body, init) => ({ body, status: init.status }) } },
      "./verified-authorization": {
        authorizeVerifiedRequest: async () => ({ user, response: null }),
      },
      "@/libs/auth": { isAdminByUserId: async (id) => id === user.id && isAdmin },
    },
  );

  assert.deepEqual(await authorizeAdminRequest("沒有管理權限"), {
    user: null,
    response: { body: { message: "沒有管理權限" }, status: 403 },
  });

  isAdmin = true;
  assert.deepEqual(await authorizeAdminRequest("沒有管理權限"), {
    user,
    response: null,
  });
});

test("selected Admin handlers use the shared boundary without changing their route contracts", async () => {
  const paths = [
    "src/app/api/admin/board-games/route.ts",
    "src/app/api/admin/board-games/[id]/route.ts",
    "src/app/api/admin/borrowings/route.ts",
    "src/app/api/admin/borrowings/[id]/route.ts",
    "src/app/api/admin/members/register-keys/route.ts",
    "src/app/api/admin/members/register-keys/[id]/route.ts",
    "src/app/api/admin/users/search/route.ts",
  ];

  for (const path of paths) {
    const source = await readSource(path);
    assert.match(source, /authorizeAdminRequest\(/, path);
    assert.doesNotMatch(source, /authorizeVerifiedRequest|isAdminByUserId/, path);
  }
});
