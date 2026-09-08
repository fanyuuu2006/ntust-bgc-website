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

test("picker state keeps search and selected identity independent", async () => {
  const stateModule = await loadCommonJsModule(
    "src/components/(admin)/admin/users/adminUserPickerState.ts",
  );
  const user = {
    id: "user-101",
    username: "same-name",
    email: "second@example.com",
    realName: "王小明",
    studentId: null,
  };
  let state = stateModule.createAdminUserPickerState();
  state = stateModule.adminUserPickerReducer(state, {
    type: "user_selected",
    user,
  });
  state = stateModule.adminUserPickerReducer(state, {
    type: "search_changed",
    value: "different query",
  });
  assert.equal(state.selectedUserId, "user-101");
  assert.equal(state.selectedUser.email, "second@example.com");
  state = stateModule.adminUserPickerReducer(state, {
    type: "search_changed",
    value: "",
  });
  assert.equal(state.selectedUserId, "user-101");
  state = stateModule.adminUserPickerReducer(state, {
    type: "selection_cleared",
  });
  assert.equal(state.selectedUser, null);
  assert.equal(state.selectedUserId, null);
});

test("editing search text clears stale candidates without clearing the selected user", async () => {
  const stateModule = await loadCommonJsModule(
    "src/components/(admin)/admin/users/adminUserPickerState.ts",
  );
  const selectedUser = {
    id: "selected-user",
    username: "selected",
    email: "selected@example.com",
    realName: "已選使用者",
    studentId: null,
  };
  const staleCandidate = {
    id: "stale-user",
    username: "stale",
    email: "stale@example.com",
    realName: "舊搜尋結果",
    studentId: null,
  };
  let state = stateModule.createAdminUserPickerState();
  state = stateModule.adminUserPickerReducer(state, {
    type: "user_selected",
    user: selectedUser,
  });
  state = stateModule.adminUserPickerReducer(state, {
    type: "change_requested",
  });
  state = stateModule.adminUserPickerReducer(state, {
    type: "search_succeeded",
    candidates: [staleCandidate],
  });
  state = stateModule.adminUserPickerReducer(state, {
    type: "search_changed",
    value: "new search",
  });

  assert.deepEqual(state.candidates, []);
  assert.equal(state.selectedUserId, "selected-user");
});

test("candidate lifecycle opens on search and closes on selection or dismissal", async () => {
  const stateModule = await loadCommonJsModule(
    "src/components/(admin)/admin/users/adminUserPickerState.ts",
  );
  const candidate = {
    id: "candidate-user",
    username: "candidate",
    email: "candidate@example.com",
    realName: "候選使用者",
    studentId: "B11309044",
  };
  let state = stateModule.createAdminUserPickerState();
  state = stateModule.adminUserPickerReducer(state, {
    type: "search_succeeded",
    candidates: [candidate],
  });
  assert.equal(state.candidates.length, 1);

  state = stateModule.adminUserPickerReducer(state, {
    type: "candidates_dismissed",
  });
  assert.deepEqual(state.candidates, []);
  assert.equal(state.selectedUser, null);

  state = stateModule.adminUserPickerReducer(state, {
    type: "search_succeeded",
    candidates: [candidate],
  });
  state = stateModule.adminUserPickerReducer(state, {
    type: "user_selected",
    user: candidate,
  });
  assert.deepEqual(state.candidates, []);
  assert.equal(state.selectedUserId, "candidate-user");
});

test("candidate identity uses one primary line and one complete secondary identity", async () => {
  const stateModule = await loadCommonJsModule(
    "src/components/(admin)/admin/users/adminUserPickerState.ts",
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
    readSource("src/components/(admin)/admin/users/adminUserPickerState.ts"),
  ]);
  const identitySource = picker + pickerState;

  assert.match(identitySource, /user\.realName/);
  assert.match(identitySource, /user\.username/);
  assert.match(identitySource, /user\.studentId/);
  assert.match(identitySource, /user\.email/);
  assert.match(picker, /找不到符合條件的使用者/);
  assert.match(picker, /搜尋使用者失敗/);
  assert.match(picker, /type="hidden"/);
  assert.match(picker, /type="button"/);
  assert.doesNotMatch(picker, /<form|truncate|line-clamp/);
});

test("candidate results use an anchored overlay with bounded internal scrolling", async () => {
  const picker = await readSource(
    "src/components/(admin)/admin/users/AdminUserPicker.tsx",
  );

  assert.match(picker, /className="relative/);
  assert.match(picker, /absolute/);
  assert.match(picker, /top-full/);
  assert.match(picker, /left-0/);
  assert.match(picker, /right-0/);
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
  const [attendance, picker] = await Promise.all([
    readSource("src/components/(admin)/admin/events/AttendanceActions.tsx"),
    readSource("src/components/(admin)/admin/users/AdminUserPicker.tsx"),
  ]);

  assert.match(attendance, /AdminUserPicker/);
  assert.doesNotMatch(attendance, /attendances\/users|setCandidates|setSearch/);
  assert.match(picker, /onKeyDown/);
  assert.match(picker, /event\.preventDefault\(\)/);
  assert.match(picker, /event\.key === "Enter"/);
});
