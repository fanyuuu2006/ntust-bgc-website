import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");
const nodeRequire = createRequire(import.meta.url);

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

const unsafeUnknownMessage = /error instanceof Error \? error\.message/;

test("admin profile maps only a true missing profile to 404", async () => {
  const route = await readSource(
    "src/app/api/admin/users/[id]/profile/route.ts",
  );

  assert.match(route, /UserProfileNotFoundError/);
  assert.match(route, /error instanceof UserProfileNotFoundError[\s\S]*status: 404/);
  assert.match(route, /unexpectedErrorResponse\([\s\S]*\[PATCH \/api\/admin\/users\/\[id\]\/profile\]/);
  assert.match(route, /unexpectedErrorResponse[\s\S]*更新使用者資料失敗，請稍後再試/);
  assert.doesNotMatch(route, unsafeUnknownMessage);
});

test("admin workflow routes never serialize an unknown Error message", async () => {
  const paths = [
    "src/app/api/admin/announcements/[id]/route.ts",
    "src/app/api/admin/events/route.ts",
    "src/app/api/admin/events/[id]/route.ts",
    "src/app/api/admin/events/[id]/attendances/route.ts",
    "src/app/api/admin/memberships/route.ts",
    "src/app/api/admin/memberships/[id]/route.ts",
    "src/app/api/admin/officers/route.ts",
    "src/app/api/admin/officers/[id]/route.ts",
    "src/app/api/admin/board-game-categories/route.ts",
    "src/app/api/admin/board-game-categories/[id]/route.ts",
    "src/app/api/admin/board-game-locations/route.ts",
    "src/app/api/admin/board-game-locations/[id]/route.ts",
  ];
  const sources = await Promise.all(paths.map(readSource));

  for (const [index, source] of sources.entries()) {
    assert.doesNotMatch(source, unsafeUnknownMessage, paths[index]);
  }
});

test("event and attendance routes distinguish validation, missing, conflict, and unknown failures", async () => {
  const [eventRoute, attendanceRoute] = await Promise.all([
    readSource("src/app/api/admin/events/[id]/route.ts"),
    readSource("src/app/api/admin/events/[id]/attendances/route.ts"),
  ]);

  assert.match(eventRoute, /EventNotFoundError[\s\S]*status: 404/);
  assert.match(eventRoute, /EventHasAttendanceRecordsError[\s\S]*status: 409/);
  assert.match(eventRoute, /unexpectedErrorResponse/);
  assert.match(attendanceRoute, /AttendanceUserNotFoundError[\s\S]*status: 404/);
  assert.match(attendanceRoute, /AttendanceAlreadyExistsError[\s\S]*status: 409/);
  assert.match(attendanceRoute, /unexpectedErrorResponse/);
});

test("unknown errors are logged server-side and receive a generic 500 response", async () => {
  const internal = new Error("PGRST123 duplicate key internal detail");
  const logged = [];
  const originalConsoleError = console.error;
  console.error = (...args) => logged.push(args);
  try {
    const { unexpectedErrorResponse } = await loadCommonJsModule(
      "src/libs/api/server-response.ts",
      {
        "next/server": {
          NextResponse: {
            json: (body, init) => ({ body, status: init.status }),
          },
        },
      },
    );
    const response = unexpectedErrorResponse(
      "[test]",
      internal,
      "操作失敗，請稍後再試",
    );

    assert.deepEqual(response, {
      body: { message: "操作失敗，請稍後再試" },
      status: 500,
    });
    assert.equal(JSON.stringify(response).includes(internal.message), false);
    assert.deepEqual(logged, [["[test]", internal]]);
  } finally {
    console.error = originalConsoleError;
  }
});

test("high-risk mutation UIs retain pending lock, recovery, and authoritative refresh", async () => {
  const paths = [
    "src/components/(auth)/register/RegisterForm.tsx",
    "src/components/(authenticated)/memberships/MembershipActivationForm.tsx",
    "src/components/(authenticated)/borrowings/CancelBorrowingAction.tsx",
    "src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx",
    "src/components/(admin)/admin/events/AttendanceActions.tsx",
  ];
  const sources = await Promise.all(paths.map(readSource));

  for (const [index, source] of sources.entries()) {
    assert.match(source, /finally\s*\{[\s\S]*set[A-Za-z]+\(false\)/, paths[index]);
    assert.match(source, /disabled=|isLoading=|isSubmitting=/, paths[index]);
    assert.match(source, /if \([^)]*(?:isLoading|isSubmitting|busy)[^)]*\) return;/, paths[index]);
  }
  for (const source of sources.slice(1)) {
    assert.match(source, /router\.refresh\(\)/);
  }
});

test("superseded create buttons are removed after proving they have no callers", async () => {
  const deadPaths = [
    "src/components/(admin)/admin/events/EventCreateButton.tsx",
    "src/components/(admin)/admin/officers/OfficerCreateButton.tsx",
  ];

  for (const path of deadPaths) {
    await assert.rejects(access(new URL(path, root)));
  }
});

test("login and registration apply bounded abuse protection before expensive work", async () => {
  const [login, register] = await Promise.all([
    readSource("src/app/api/auth/login/route.ts"),
    readSource("src/app/api/auth/register/route.ts"),
  ]);

  for (const route of [login, register]) {
    assert.match(route, /checkRateLimit/);
    assert.match(route, /getRequestIp/);
    assert.match(route, /status: 429/);
    assert.match(route, /Retry-After/);
  }
  assert.match(register, /checkRateLimit[\s\S]*verifyTurnstile/);
});

test("logout exposes recoverable feedback and cannot be submitted twice", async () => {
  const [component, route] = await Promise.all([
    readSource("src/components/LogoutButton.tsx"),
    readSource("src/app/api/auth/logout/route.ts"),
  ]);

  assert.match(component, /isLoading/);
  assert.match(component, /FormFeedback/);
  assert.match(component, /finally[\s\S]*setIsLoading\(false\)/);
  assert.match(route, /try[\s\S]*authService\.logout[\s\S]*catch/);
  assert.match(route, /登出失敗，請稍後再試[\s\S]*status: 500/);
});
