import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
function load(path, mocks = {}) {
  const filename = resolve(root, path);
  const loadedModule = { exports: {} };
  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "module", "exports", js)((id) => {
    if (id in mocks) return mocks[id];
    if (id === "server-only") return {};
    if (id.startsWith("@/") || id.startsWith(".")) {
      const base = id.startsWith("@/") ? resolve(root, "src", id.slice(2)) : resolve(dirname(filename), id);
      for (const ext of [".ts", ".tsx"]) {
        try { readFileSync(base + ext); } catch { continue; }
        return load(base + ext, mocks);
      }
    }
    return require(id);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

test("inventory suggestion uses highest numeric value, including gaps and empty data", async () => {
  for (const [numbers, expected] of [[[607], 608], [[1, 2, 3, 10], 11], [[1, 2, 4], 5], [[], 1]]) {
    const calls = [];
    const query = {
      select(value) { calls.push(["select", value]); return this; },
      order(...args) { calls.push(["order", ...args]); return this; },
      limit(value) { calls.push(["limit", value]); return this; },
      async maybeSingle() { return { data: numbers.length ? { inventory_number: Math.max(...numbers) } : null, error: null }; },
    };
    const { boardGamesRepository } = load("src/repositories/board-games.repository.ts", { "@/libs/supabase/server": { supabase: { from: () => query } } });
    const highest = await boardGamesRepository.findHighestInventoryNumber();
    const { boardGamesService } = load("src/services/board-games/board-games.service.ts", {
      "@/repositories/board-games.repository": { boardGamesRepository: { findHighestInventoryNumber: async () => highest } },
      "@/libs/supabase/server": { supabase: {} },
    });
    assert.equal(await boardGamesService.getNextInventoryNumber(), expected);
    assert.deepEqual(calls, [["select", "inventory_number"], ["order", "inventory_number", { ascending: false }], ["limit", 1]]);
  }
});

test("inventory uniqueness race becomes a safe domain conflict on create and update", async () => {
  const { RepositoryError } = load("src/repositories/shared/errors.ts");
  const errors = load("src/services/board-games/board-games.errors.tsx");
  const conflict = new RepositoryError("test", { code: "23505", message: 'duplicate key violates unique constraint "board_games_inventory_number_key"' });
  const { boardGamesService } = load("src/services/board-games/board-games.service.ts", {
    "@/repositories/shared/errors": { RepositoryError },
    "@/services/board-games/board-games.errors": errors,
    "./board-games.errors": errors,
    "@/libs/supabase/server": { supabase: {} },
    "@/repositories/board-games.repository": { boardGamesRepository: {
      existsByInventoryNumber: async () => false,
      findById: async () => ({ id: "game", status: "available" }),
      create: async () => { throw conflict; }, updateById: async () => { throw conflict; },
    } },
    "@/repositories/board-game-categories.repository": { boardGameCategoriesRepository: { findById: async () => ({}) } },
    "@/repositories/board-game-locations.repository": { boardGameLocationsRepository: { findById: async () => ({}) } },
  });
  const input = { name: "測試", inventory_number: 608, category_id: "11111111-1111-4111-8111-111111111111", location_id: "11111111-1111-4111-8111-111111111111" };
  await assert.rejects(() => boardGamesService.createBoardGame(input), errors.DuplicateInventoryNumberError);
  await assert.rejects(() => boardGamesService.updateBoardGame("game", input), errors.DuplicateInventoryNumberError);
});

test("create suggestion is editable and failures preserve entered values", () => {
  const page = read("src/app/(admin)/admin/board-games/new/page.tsx");
  const form = read("src/components/(admin)/admin/board-games/BoardGameForm.tsx");
  assert.match(page, /getNextInventoryNumber/);
  assert.match(page, /inventory_number: String\(nextInventoryNumber\)/);
  assert.match(form, /value=\{values.inventory_number\} onChange=\{handleChange\}/);
  assert.doesNotMatch(form.slice(form.indexOf("} catch (err)"), form.indexOf("return (\n    <Card")), /router\.push|setValues/);
});

test("inventory displays never pad numeric values; unrelated identifiers are untouched", () => {
  function walk(dir) { return readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]); }
  for (const path of walk("src")) {
    assert.doesNotMatch(read(path), /inventory_number[^\n]*padStart/);
  }
  const render = require("react-dom/server").renderToStaticMarkup;
  const { BoardGameCard } = load("src/components/(public)/board-games/BoardGameCard.tsx", { "next/link": { default: ({ children, ...props }) => require("react").createElement("a", props, children) } });
  for (const number of [1, 67, 607]) {
    const html = render(require("react").createElement(BoardGameCard, { boardGame: { id: "game", name: "測試", inventory_number: number, status: "available", category: { name: "分類" }, location: { name: "位置" }, stats: { completedBorrowCount: 0, recentBorrowCount: 0, lastBorrowedAt: null } } }));
    assert.ok(html.includes(String(number)));
    assert.ok(!html.includes(number === 1 ? "001" : number === 67 ? "067" : "0607"));
  }
});

test("borrowing delete application capability is gone; lifecycle actions remain", () => {
  const ui = read("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx");
  const route = read("src/app/api/admin/borrowings/[id]/route.ts");
  assert.doesNotMatch(ui, /"delete"|刪除借用紀錄|method: "DELETE"/);
  assert.doesNotMatch(route, /export async function DELETE/);
  assert.doesNotMatch(read("src/services/board-games/board-games.service.ts"), /deleteBorrowing/);
  assert.doesNotMatch(read("src/repositories/board-game-borrowings.repository.ts"), /deleteTransactionally|deleteById|delete_board_game_borrowing/);
  for (const action of ["approve", "reject", "checkout", "return", "edit"]) assert.ok(ui.includes(`"${action}"`));
});

test("admin return context round trips owned lists and rejects external/cross-family destinations", () => {
  const { getAdminReturnPath, buildAdminReturnHref, buildAdminListHref } = load("src/utils/admin-return.ts");
  for (const family of ["/admin/board-games", "/admin/announcements", "/admin/users", "/admin/events"]) {
    const list = buildAdminListHref(family, { search: "中文 & long", page: 3, pageSize: 20, orderBy: "name", orderDirection: "desc", status: "available" });
    const href = buildAdminReturnHref(`${family}/123/edit`, list, family);
    assert.equal(getAdminReturnPath(new URL(href, "https://local.test").searchParams.get("returnTo"), family), list);
    for (const invalid of [undefined, "https://evil.example", "//evil.example", "javascript:alert(1)", "/\\evil.example", `${family}/../users`, `${family}/123`, `${family}%2f..%2fusers`, [list], `${family}\n?x=1`]) {
      assert.equal(getAdminReturnPath(invalid, family), family);
    }
  }
});

test("long announcement content and modal controls have containment at their owner", () => {
  const page = read("src/app/(admin)/admin/announcements/page.tsx");
  assert.match(page, /table-fixed/);
  assert.match(page, /wrap-anywhere/);
  assert.doesNotMatch(page, /block truncate|min-w-\[820px\]/);
  assert.match(read("src/components/(public)/announcements/AnnouncementRow.tsx"), /wrap-anywhere/);
  assert.match(read("src/components/ui/Badge.tsx"), /shrink-0 whitespace-nowrap/);
  assert.match(read("src/components/ui/Input.tsx"), /max-w-full/);
  assert.match(read("src/components/ui/Field.tsx"), /min-w-0/);
});

test("required fields reuse Field indicator and retain native requirements", () => {
  const { Field } = load("src/components/ui/Field.tsx");
  const render = require("react-dom/server").renderToStaticMarkup;
  const react = require("react");
  assert.match(render(react.createElement(Field, { label: "名稱", htmlFor: "name", required: true })), /after:content/);
  assert.doesNotMatch(render(react.createElement(Field, { label: "說明", htmlFor: "description" })), /after:content/);
  assert.match(read("src/components/FieldInput.tsx"), /aria-required=\{field.required\}/);
  for (const path of ["board-games/BoardGameForm", "events/EventActions", "events/EventRecords", "academic-years/AcademicYearActions"]) {
    const source = read(`src/components/(admin)/admin/${path}.tsx`);
    for (const [, field, control] of source.matchAll(/(<Field\s[^>]+>)(\s*<(?:Input|Select|Textarea)\b[^>]+>)/g)) {
      if (/\brequired\b/.test(control)) assert.match(field, /\brequired\b/, `${path}: ${field}`);
    }
  }
});

test("verification operations expose safe latest metadata, never token material", async () => {
  const calls = [];
  const record = { created_at: "2026-09-12T00:00:00Z", expires_at: "2026-09-12T01:00:00Z", consumed_at: null };
  const query = { select(v) { calls.push(v); return this; }, eq() { return this; }, order() { return this; }, limit() { return this; }, async maybeSingle() { return { data: record, error: null }; } };
  const { emailVerificationRepository } = load("src/repositories/email-verification.repository.ts", { "@/libs/supabase/server": { supabase: { from: () => query } } });
  assert.deepEqual(await emailVerificationRepository.findLatestMetadataByUserId("user"), record);
  assert.deepEqual(calls, ["created_at, expires_at, consumed_at"]);
  const page = read("src/app/(admin)/admin/users/[id]/page.tsx");
  assert.match(page, /getLatestVerificationForAdmin/);
  assert.doesNotMatch(page, /token_hash|rawToken|markVerified/);
  const { getVerificationTokenStatus } = load("src/services/email-verification/email-verification-status.ts");
  assert.equal(getVerificationTokenStatus(record, new Date("2026-09-12T00:30:00Z")), "active");
  assert.equal(getVerificationTokenStatus(record, new Date(record.expires_at)), "expired");
  assert.equal(getVerificationTokenStatus({ ...record, consumed_at: record.created_at }), "consumed");
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.actions)];
}

function componentHarness(path, exportName, props, api) {
  const state = [];
  let cursor = 0;
  const pushes = [];
  const React = require("react");
  const loadedModule = load(path, {
    react: { ...React, useMemo: (fn) => fn(), useState: (initial) => {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    } },
    "next/navigation": { useRouter: () => ({ push: (href) => pushes.push(href), refresh() {} }) },
    "@/libs/api/client": { apiClient: api },
  });
  return { pushes, render: () => { cursor = 0; return nodes(loadedModule[exportName](props)); } };
}

test("board-game create/edit submit and cancel retain filters; failed submit retains editable input", async () => {
  for (const mode of ["create", "edit"]) {
    const returnTo = "/admin/board-games?location=corner&status=available&search=CJK&page=3&pageSize=10&orderBy=name&orderDirection=desc";
    const requests = [];
    let fail = false;
    const harness = componentHarness("src/components/(admin)/admin/board-games/BoardGameForm.tsx", "BoardGameForm", {
      mode, returnTo, boardGameId: "game", categories: [], locations: [],
      initialValues: { name: "測試桌遊", inventory_number: "608", category_id: "11111111-1111-4111-8111-111111111111", location_id: "11111111-1111-4111-8111-111111111111" },
    }, async (...args) => { requests.push(args); if (fail) throw new Error("conflict"); });
    let tree = harness.render();
    tree.find((n) => n.props?.field?.id === "inventory_number").props.onChange({ target: { name: "inventory_number", value: "701" } });
    tree = harness.render();
    await tree.find((n) => n.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(requests[0][1].body.inventory_number, 701);
    assert.equal(requests[0][1].method, mode === "create" ? "POST" : "PATCH");
    assert.deepEqual(harness.pushes, [returnTo]);
    harness.render().find((n) => n.props?.children === "取消").props.onClick();
    assert.deepEqual(harness.pushes, [returnTo, returnTo]);
    fail = true;
    await harness.render().find((n) => n.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(harness.pushes.length, 2);
    assert.equal(harness.render().find((n) => n.props?.field?.id === "inventory_number").props.value, "701");
  }
});

test("announcement save and cancel preserve query; failure remains on the populated form", async () => {
  const returnTo = "/admin/announcements?search=long&status=draft&page=2&pageSize=10&orderBy=title&orderDirection=asc";
  let fail = false;
  const harness = componentHarness("src/components/(admin)/admin/announcements/AnnouncementEditor.tsx", "AnnouncementEditor", {
    returnTo, announcement: { id: 1, title: "測試", content: "內容", is_published: false },
  }, async () => { if (fail) throw new Error("failed"); });
  let tree = harness.render();
  tree.find((n) => n.props?.id === "announcement-title").props.onChange({ target: { value: "修改後標題" } });
  tree = harness.render();
  await tree.find((n) => n.props?.children === "儲存變更").props.onClick();
  assert.deepEqual(harness.pushes, [returnTo]);
  harness.render().find((n) => n.props?.children === "取消").props.onClick();
  fail = true;
  await harness.render().find((n) => n.props?.children === "儲存變更").props.onClick();
  assert.deepEqual(harness.pushes, [returnTo, returnTo]);
  assert.equal(harness.render().find((n) => n.props?.id === "announcement-title").props.value, "修改後標題");
});

test("normal, anonymous and unverified users cannot read operational token metadata", async () => {
  for (const [viewer, admin] of [[null, false], [{ id: "user", email_verified_at: null }, true], [{ id: "user", email_verified_at: "date" }, false]]) {
    let reads = 0;
    const { getLatestVerificationForAdmin } = load("src/services/email-verification/email-verification-operations.service.ts", {
      "@/libs/auth": { getCurrentUser: async () => viewer, isAdminByUserId: async () => admin },
      "@/repositories/email-verification.repository": { emailVerificationRepository: { findLatestMetadataByUserId: async () => { reads++; return null; } } },
    });
    await assert.rejects(() => getLatestVerificationForAdmin("target"), /權限/);
    assert.equal(reads, 0);
  }
});

test("verified administrator receives only safe latest verification fields", async () => {
  const metadata = { created_at: "2026-01-01T00:00:00Z", expires_at: "2026-01-01T01:00:00Z", consumed_at: null };
  const { getLatestVerificationForAdmin } = load("src/services/email-verification/email-verification-operations.service.ts", {
    "@/libs/auth": { getCurrentUser: async () => ({ id: "admin", email_verified_at: "date" }), isAdminByUserId: async () => true },
    "@/repositories/email-verification.repository": { emailVerificationRepository: { findLatestMetadataByUserId: async () => metadata } },
  });
  assert.deepEqual(await getLatestVerificationForAdmin("target"), { ...metadata, status: "expired" });
});

test("event attendance filters preserve the parent list return context", () => {
  const page = read("src/app/(admin)/admin/events/[id]/page.tsx");
  assert.match(page, /new URLSearchParams\(\{ returnTo \}\)/);
  assert.match(page, /PreservedQueryFields query=\{\{ returnTo,/);
  assert.match(page, /ImmediateQuerySelect appliedQuery=\{\{ returnTo,/);
  assert.match(page, /Pagination[^\n]+query=\{\{ returnTo,/);
  for (const path of ["board-games/BoardGameTable", "events/EventRecords"]) {
    assert.match(read(`src/components/(admin)/admin/${path}.tsx`), /buildAdminReturnHref/);
  }
});

test("server CRUD pages pass validated return context to forms and back links", async () => {
  const boardGame = { id: "game", name: "測試", inventory_number: 607, category_id: "category", location_id: "location", status: "available" };
  const mocks = {
    "@/services/board-games/board-games.service": { boardGamesService: { getBoardGameById: async () => boardGame, listCategories: async () => [], listLocations: async () => [], getNextInventoryNumber: async () => 608 } },
    "@/services/announcements/announcements.service": { announcementsService: { getForAdmin: async () => ({ id: 1, title: "標題", content: "內容", is_published: false }) } },
    "@/services/users/users.service": { usersService: { getUserForAdmin: async () => ({ id: "user", name: "名字", email: "test@example.invalid", created_at: "2026-01-01", updated_at: "2026-01-01", memberships: [], officer_positions: [] }) } },
    "@/services/email-verification/email-verification-operations.service": { getLatestVerificationForAdmin: async () => null },
  };
  for (const [family, workflow] of [["board-games", "new"], ["board-games", "[id]/edit"], ["announcements", "new"], ["announcements", "[id]/edit"], ["users", "[id]"]]) {
    const list = `/admin/${family}`;
    const { default: Page } = load(`src/app/(admin)/admin/${family}/${workflow}/page.tsx`, mocks);
    for (const candidate of [`${list}?search=long&page=3&pageSize=20`, undefined, "//evil.example"]) {
      const expected = candidate?.startsWith(list) ? candidate : list;
      const tree = nodes(await Page({ params: Promise.resolve({ id: "1" }), searchParams: Promise.resolve({ returnTo: candidate }) }));
      assert.ok(tree.some((n) => n.props?.href === expected), `${family}/${workflow} back link`);
      if (family !== "users") assert.ok(tree.some((n) => n.props?.returnTo === expected), `${family}/${workflow} form`);
      if (family === "board-games" && workflow === "new") assert.ok(tree.some((n) => n.props?.initialValues?.inventory_number === "608"));
    }
  }
});

test("inventory safe integer boundary never produces a rounded default", async () => {
  const { boardGamesService } = load("src/services/board-games/board-games.service.ts", {
    "@/repositories/board-games.repository": { boardGamesRepository: { findHighestInventoryNumber: async () => Number.MAX_SAFE_INTEGER } },
    "@/libs/supabase/server": { supabase: {} },
  });
  assert.equal(await boardGamesService.getNextInventoryNumber(), null);
});

test("inventory duplicate domain conflict preserves safe HTTP 409 contract", async () => {
  const errors = load("src/services/board-games/board-games.errors.tsx");
  const { POST } = load("src/app/api/admin/board-games/route.ts", {
    "@/libs/auth": { isAdminByUserId: async () => true },
    "@/libs/api/verified-authorization": { authorizeVerifiedRequest: async () => ({ user: { id: "admin" }, response: null }) },
    "@/services/board-games/board-games.errors": errors,
    "@/services/board-games/board-games.service": { boardGamesService: { createBoardGame: async () => { throw new errors.DuplicateInventoryNumberError(); } } },
  });
  const result = await POST(new Request("http://localhost/api/admin/board-games", { method: "POST", body: JSON.stringify({ inventory_number: 608 }) }));
  assert.equal(result.status, 409);
  const body = await result.json();
  assert.match(body.message, /社產編號/);
  assert.doesNotMatch(JSON.stringify(body), /23505|constraint|stack|Repository/);
});
