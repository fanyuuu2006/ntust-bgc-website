import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

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

test("admin user lookup is admin-only, bounded, and returns a picker DTO", async () => {
  const [route, service, types] = await Promise.all([
    readSource("src/app/api/admin/users/search/route.ts"),
    readSource("src/services/users/users.service.tsx"),
    readSource("src/services/users/users.types.ts"),
  ]);

  assert.match(route, /authorizeVerifiedRequest/);
  assert.match(route, /isAdminByUserId/);
  assert.match(route, /searchForAdminPicker/);
  assert.match(service, /pageSize: ADMIN_USER_PICKER_LIMIT/);
  assert.match(service, /ADMIN_USER_PICKER_LIMIT = 20/);
  assert.match(types, /id: string/);
  assert.match(types, /username: string/);
  assert.match(types, /email: string/);
  assert.match(types, /realName: string \| null/);
  assert.match(types, /studentId: string \| null/);
  assert.doesNotMatch(types, /phone|department|school|credential|session/);
});

test("admin picker search discovers users beyond a preloaded first page by every identity field", async () => {
  const schemas = await loadCommonJsModule("src/services/users/users.schema.tsx");
  const calls = [];
  const users = {
    "user-101": { id: "user-101", name: "late-user", email: "late@example.com" },
    "real-match": { id: "real-match", name: "duplicate", email: "real@example.com" },
    "student-match": { id: "student-match", name: "duplicate", email: "student@example.com" },
  };
  const profiles = {
    "user-101": { user_id: "user-101", real_name: "第一百零一位", student_id: null },
    "real-match": { user_id: "real-match", real_name: "王小明", student_id: null },
    "student-match": { user_id: "student-match", real_name: "王小明", student_id: "B11234567" },
  };
  const usersRepository = {
    findIdsBySearch: async (search) => search === "late-user" ? ["user-101"] : [],
    findMany: async (options) => {
      calls.push(options);
      const data = (options.userIds ?? []).map((id) => users[id]).filter(Boolean);
      return { data, total: data.length, page: 1, pageSize: options.pageSize, totalPages: 1 };
    },
  };
  const userProfilesRepository = {
    findUserIdsBySearch: async (search) =>
      search === "王小明"
        ? ["real-match"]
        : search === "B11234567"
          ? ["student-match"]
          : [],
    findManyByUserIds: async (ids) => ids.map((id) => profiles[id]).filter(Boolean),
  };
  const { usersService } = await loadCommonJsModule(
    "src/services/users/users.service.tsx",
    {
      "server-only": {},
      "@/repositories/user-profiles.repository": { userProfilesRepository },
      "@/repositories/board-game-borrowings.repository": { boardGameBorrowingsRepository: {} },
      "@/repositories/event-attendances.repository": { eventAttendancesRepository: {} },
      "@/repositories/users.repository": { usersRepository },
      "./users.schema": schemas,
      "./users.errors": {
        UserProfileAlreadyExistsError: class extends Error {},
        UserProfileNotFoundError: class extends Error {},
      },
      "@/services/officer-positions/officer-positions.service": {
        officerPositionsService: {},
      },
      "@/services/memberships/memberships.service": { membershipService: {} },
    },
  );

  const lateUser = await usersService.searchForAdminPicker({ search: "late-user" });
  const realName = await usersService.searchForAdminPicker({ search: "王小明" });
  const studentId = await usersService.searchForAdminPicker({ search: "B11234567" });

  assert.equal(lateUser[0].id, "user-101");
  assert.equal(realName[0].realName, "王小明");
  assert.equal(studentId[0].studentId, "B11234567");
  assert.ok(calls.every((call) => call.pageSize === 20));
  assert.deepEqual(Object.keys(studentId[0]).sort(), [
    "email",
    "id",
    "realName",
    "studentId",
    "username",
  ]);
});

test("shared searchable entity picker owns the complete interaction lifecycle", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", { pretendToBeVisual: true });
  const previous = { window: globalThis.window, document: globalThis.document, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { SearchableEntityPicker } = load("src/components/(admin)/admin/SearchableEntityPicker.tsx", {
    "next/navigation": { useRouter: () => ({ replace() {} }) },
  });
  const items = [{ id: "first", label: "第一位" }, { id: "second", label: "第二位" }];
  let calls = 0;
  const changes = [];
  const root = createRoot(dom.window.document.getElementById("app"));
  const inputValueSetter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  const props = {
    name: "entity_id", required: true, onChange: (value) => changes.push(value?.id ?? null),
    search: async (query) => { calls += 1; if (query === "error") throw new Error("failed"); return query === "empty" ? [] : [items[Math.min(calls - 1, 1)]]; },
    getKey: (item) => item.id, renderResult: (item) => createElement("span", null, item.label), renderSelected: (item) => createElement("span", null, item.label),
    searchLabel: "搜尋項目", searchPlaceholder: "搜尋項目", resultsLabel: "項目搜尋結果", emptyMessage: "沒有項目", errorMessage: "搜尋失敗", clearSelectionLabel: (item) => `清除：${item.label}`,
  };
  const fill = async (value) => { const input = dom.window.document.querySelector('input[type="search"]'); await act(async () => { inputValueSetter.call(input, value); input.dispatchEvent(new dom.window.InputEvent("input", { bubbles: true, data: value })); }); };
  const click = async (name) => { const button = [...dom.window.document.querySelectorAll("button")].find((candidate) => candidate.textContent.trim() === name || candidate.getAttribute("aria-label") === name); assert.ok(button, `missing ${name}`); await act(async () => { button.click(); await new Promise((resolve) => setTimeout(resolve, 0)); }); };
  try {
    await act(async () => root.render(createElement("form", null, createElement(SearchableEntityPicker, props), createElement("button", { type: "button", id: "outside" }, "外部"))));
    assert.equal(dom.window.document.querySelector('[role="listbox"]'), null);
    assert.equal(dom.window.document.querySelector('input[type="search"]').required, true);
    assert.equal(dom.window.document.querySelector("form").checkValidity(), false);
    await fill("first"); await click("清除搜尋"); assert.equal(dom.window.document.querySelector('input[type="search"]').value, "");
    await fill("first"); await click("搜尋"); assert.ok(dom.window.document.querySelector('[role="listbox"]')); await click("第一位");
    assert.equal(new dom.window.FormData(dom.window.document.querySelector("form")).get("entity_id"), "first");
    assert.equal(dom.window.document.querySelector("form").checkValidity(), true);
    await click("清除：第一位"); assert.equal(new dom.window.FormData(dom.window.document.querySelector("form")).get("entity_id"), null);
    await fill("second"); await click("搜尋"); await click("第二位"); assert.deepEqual(changes, ["first", null, "second"]);
    await click("清除：第二位"); await fill("empty"); await click("搜尋"); assert.match(dom.window.document.body.textContent, /沒有項目/);
    await fill("error"); await click("搜尋"); assert.match(dom.window.document.body.textContent, /搜尋失敗/);
    await fill("first"); await click("搜尋"); const picker = dom.window.document.querySelector('input[type="search"]').closest("div.relative"); await act(async () => picker.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }))); assert.equal(dom.window.document.querySelector('[role="listbox"]'), null);
  } finally {
    await act(async () => root.unmount()); Object.assign(globalThis, previous); dom.window.close();
  }
});

test("candidate identity uses one primary line and one complete secondary identity", async () => {
  const stateModule = await loadCommonJsModule(
    "src/components/(admin)/admin/users/adminUserPickerIdentity.ts",
  );
  const identity = stateModule.getAdminUserPickerIdentity({
    id: "duplicate-user",
    username: "飯魚 🐟",
    email: "bingxiao526@gmail.com",
    realName: "范余振富",
    studentId: "B11309044",
  });

  assert.equal(identity.primary, "范余振富");
  assert.equal(
    identity.secondary,
    "飯魚 🐟 · B11309044 · bingxiao526@gmail.com",
  );
});

test("membership and officer creation no longer depend on the first 100 users", async () => {
  const [membershipPage, officerPage, membershipAction, officerAction] =
    await Promise.all([
      readSource("src/app/(admin)/admin/memberships/page.tsx"),
      readSource("src/app/(admin)/admin/officers/page.tsx"),
      readSource("src/components/(admin)/admin/memberships/MembershipCreateButton.tsx"),
      readSource("src/components/(admin)/admin/officers/OfficerActions.tsx"),
    ]);

  assert.doesNotMatch(membershipPage, /listForAdmin\(\{ page: 1, pageSize: 100 \}\)/);
  assert.doesNotMatch(officerPage, /listForAdmin\(\{ page: 1, pageSize: 100 \}\)/);
  assert.match(membershipAction, /AdminUserPicker/);
  assert.match(officerAction, /AdminUserPicker/);
  assert.doesNotMatch(membershipAction + officerAction, /users\.map|<option key=\{user\.id\}/);
});

test("picker renders distinguishable compact identities and safe states", async () => {
  const [picker, pickerState] = await Promise.all([
    readSource("src/components/(admin)/admin/users/AdminUserPicker.tsx"),
    readSource("src/components/(admin)/admin/users/adminUserPickerIdentity.ts"),
  ]);
  const identitySource = picker + pickerState;

  assert.match(identitySource, /user\.realName/);
  assert.match(identitySource, /user\.username/);
  assert.match(identitySource, /user\.studentId/);
  assert.match(identitySource, /user\.email/);
  assert.match(picker, /找不到符合條件的使用者/);
  assert.match(picker, /搜尋使用者失敗/);
  assert.match(picker, /SearchableEntityPicker/);
  assert.doesNotMatch(picker, /<form|useReducer/);
});

test("candidate results use an anchored overlay with bounded internal scrolling", async () => {
  const picker = await readSource("src/components/(admin)/admin/SearchableEntityPicker.tsx");

  assert.match(picker, /"relative min-w-0 max-w-full"/);
  assert.match(picker, /absolute/);
  assert.match(picker, /top-full/);
  assert.match(picker, /inset-x-0/);
  assert.match(picker, /max-h-/);
  assert.match(picker, /overflow-y-auto/);
  assert.match(picker, /onKeyDown/);
  assert.match(picker, /event\.key === "Escape"/);
  assert.match(
    picker,
    /event\.key === "Escape"[\s\S]{0,180}event\.preventDefault\(\)[\s\S]{0,100}event\.stopPropagation\(\)/,
  );
});

test("attendance reuses the picker and Enter cannot submit the outer form", async () => {
  const [attendance, picker, foundation] = await Promise.all([
    readSource("src/components/(admin)/admin/events/AttendanceActions.tsx"),
    readSource("src/components/(admin)/admin/users/AdminUserPicker.tsx"),
    readSource("src/components/(admin)/admin/SearchableEntityPicker.tsx"),
  ]);

  assert.match(attendance, /AdminUserPicker/);
  assert.doesNotMatch(attendance, /attendances\/users|setCandidates|setSearch/);
  assert.match(picker, /SearchableEntityPicker/);
  assert.match(foundation, /onKeyDown/);
  assert.match(foundation, /event\.preventDefault\(\)/);
  assert.match(foundation, /event\.key === "Enter"/);
});
