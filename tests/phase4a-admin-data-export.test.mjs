import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { unzipSync, strFromU8 } from "fflate";
import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");
const exporter = load("src/libs/export/export.ts", {
  "@/libs/export/types": {},
});

const document = {
  domain: "test",
  filenameBase: "safe-test",
  worksheetName: "測試",
  filters: { search: "桌遊" },
  columns: [
    { key: "name", header: "名稱", width: 24 },
    { key: "note", header: "備註", width: 24 },
    { key: "count", header: "數量", kind: "number" },
    { key: "createdAt", header: "建立時間", kind: "instant" },
  ],
  rows: [{ name: "測試, \"桌遊\"", note: " =SUM(1,2)\n下一行", count: 2, createdAt: "2026-09-20T16:00:00.000Z" }],
};

test("CSV is UTF-8 BOM, RFC quoted, newline safe, and formula neutralized after whitespace", () => {
  const csv = exporter.serializeCsv(document).toString("utf8");
  assert.ok(csv.startsWith("\uFEFF名稱,備註,數量,建立時間\r\n"));
  assert.match(csv, /"測試, ""桌遊"""/);
  assert.match(csv, /"' =SUM\(1,2\)\n下一行"/);
  assert.match(csv, /2026-09-21 00:00:00/);
});

test("formula prefixes and control/whitespace bypasses are neutralized while normal text is preserved", () => {
  for (const value of ["=1+1", "+cmd", "-2+3", "@SUM(A1)", "\t=1", "\n+1"]) {
    assert.equal(exporter.neutralizeSpreadsheetFormula(value), `'${value}`);
  }
  assert.equal(exporter.neutralizeSpreadsheetFormula("normal - text"), "normal - text");
});

test("XLSX has a frozen header and stores hostile content as literal text", async () => {
  const xlsx = await exporter.serializeXlsx(document);
  assert.equal(xlsx.subarray(0, 2).toString(), "PK");
  const files = unzipSync(new Uint8Array(xlsx));
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  const shared = files["xl/sharedStrings.xml"] ? strFromU8(files["xl/sharedStrings.xml"]) : "";
  assert.match(sheet, /<pane[^>]*ySplit="1"[^>]*state="frozen"/);
  assert.doesNotMatch(sheet, /<f>/);
  assert.ok(shared.includes("' =SUM(1,2)"));
  assert.ok(shared.includes("測試"));
});

test("JSON uses an explicit envelope and preserves ISO instants", () => {
  const value = JSON.parse(exporter.serializeJson(document, new Date("2026-09-21T00:00:00Z")).toString("utf8"));
  assert.equal(value.exportedAt, "2026-09-21T00:00:00.000Z");
  assert.equal(value.domain, "test");
  assert.deepEqual(value.filters, { search: "桌遊" });
  assert.equal(value.count, 1);
  assert.equal(value.data[0].createdAt, "2026-09-20T16:00:00.000Z");
});

test("attachment response uses safe filename, MIME and no-store headers", async () => {
  const response = await exporter.createExportResponse(document, "csv");
  assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
  assert.match(response.headers.get("content-disposition"), /^attachment; filename="safe-test-\d{4}-\d{2}-\d{2}\.csv"$/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("zero rows produce valid header-only CSV instead of an error", () => {
  const csv = exporter.serializeCsv({ ...document, rows: [] }).toString("utf8");
  assert.equal(csv, "\uFEFF名稱,備註,數量,建立時間");
});

test("DateOnly values remain exact calendar dates without timezone conversion", () => {
  const dateDocument = {
    ...document,
    columns: [{ key: "date", header: "日期", kind: "date-only" }],
    rows: [{ date: "2026-09-07" }],
  };
  assert.equal(exporter.serializeCsv(dateDocument).toString("utf8"), "\uFEFF日期\r\n2026-09-07");
  const json = JSON.parse(exporter.serializeJson(dateDocument).toString("utf8"));
  assert.equal(json.data[0].date, "2026-09-07");
});

test("export route authorizes first, validates format, strips pagination and maps safe errors", async () => {
  const route = await readSource("src/app/api/admin/exports/[domain]/route.ts");
  assert.match(route, /authorizeAdminRequest/);
  assert.match(route, /delete query\.page;/);
  assert.match(route, /delete query\.pageSize;/);
  assert.match(route, /ExportRowLimitExceededError/);
  assert.match(route, /status: 422/);
  assert.doesNotMatch(route, /select\(|supabase|tableName|columns.*request/);
});

test("six domain exports use explicit columns, bounded reads and omit forbidden data", async () => {
  const source = await readSource("src/services/admin-exports/admin-exports.service.ts");
  for (const domain of ["users", "memberships", "officers", "board-games", "borrowings", "event-attendance"]) {
    assert.match(source, new RegExp(`domain: "${domain}"`));
  }
  assert.match(source, /ADMIN_EXPORT_ROW_LIMIT/);
  assert.match(source, /key !== "page" && key !== "pageSize"/);
  assert.match(source, /maxPageSize: ADMIN_EXPORT_ROW_LIMIT/g);
  assert.doesNotMatch(source, /password_hash|token_hash|register_key|SUPABASE_SECRET|session/i);
  assert.doesNotMatch(source, /館藏/);
});

test("row cap matches the reviewed PostgREST max_rows ceiling", async () => {
  const config = await readSource("supabase/config.toml");
  assert.equal(exporter.ADMIN_EXPORT_ROW_LIMIT, 1000);
  assert.match(config, /^max_rows = 1000$/m);
  assert.match(new exporter.ExportRowLimitExceededError(1001).message, /匯出上限/);
});

test("export UI carries applied query but never pagination", async () => {
  const source = await readSource("src/components/(admin)/admin/exports/AdminExportMenu.tsx");
  assert.match(source, /key === "page" \|\| key === "pageSize"/);
  assert.match(source, /匯出目前篩選結果/);
  assert.match(source, /CSV/);
  assert.match(source, /Excel \(\.xlsx\)/);
  assert.match(source, /JSON/);
});

test("all first-wave Admin surfaces expose the shared export menu", async () => {
  const pages = [
    ["src/app/(admin)/admin/users/page.tsx", "users"],
    ["src/app/(admin)/admin/memberships/page.tsx", "memberships"],
    ["src/app/(admin)/admin/officers/page.tsx", "officers"],
    ["src/app/(admin)/admin/board-games/page.tsx", "board-games"],
    ["src/app/(admin)/admin/board-games/borrowings/page.tsx", "borrowings"],
    ["src/app/(admin)/admin/events/[id]/page.tsx", "event-attendance"],
  ];
  for (const [path, domain] of pages) {
    const source = await readSource(path);
    assert.match(source, new RegExp(`AdminExportMenu domain="${domain}"`));
  }
});

test("every domain reuses normalized applied filters while overriding pagination server-side", async () => {
  const calls = {};
  const empty = (name) => async (options) => { calls[name] = options; return { data: [], total: 0, page: 1, pageSize: 1000, totalPages: 0 }; };
  const service = load("src/services/admin-exports/admin-exports.service.ts", {
    "@/libs/export/export": { ADMIN_EXPORT_ROW_LIMIT: 1000, ExportRowLimitExceededError: class extends Error {} },
    "@/libs/export/types": {},
    "@/services/users/users.service": { usersService: { listForAdmin: empty("users") } },
    "@/services/memberships/memberships.service": { membershipService: { listAdminMemberships: empty("memberships") } },
    "@/services/officer-positions/officer-positions.service": { officerPositionsService: { listForAdmin: empty("officers") } },
    "@/services/board-games/board-games.service": { boardGamesService: { listAdminBoardGamesWithCategoryAndLocation: empty("board-games"), listBorrowings: empty("borrowings") } },
    "@/services/events/events.service": { eventsService: { getEventById: async () => ({ id: "10000000-0000-4000-8000-000000000001", name: "QA" }), listAttendancesForAdmin: async (_id, options) => { calls["event-attendance"] = options; return { data: [], total: 0, page: 1, pageSize: 1000, totalPages: 0 }; } } },
  }).adminExportsService;

  const uuid = "10000000-0000-4000-8000-000000000001";
  await service.createDocument("users", { page: "9", pageSize: "10", search: "王", orderBy: "name", orderDirection: "asc", emailVerification: "verified" });
  await service.createDocument("memberships", { page: "9", pageSize: "10", search: "王", academic_year_id: uuid, status: "active" });
  await service.createDocument("officers", { page: "9", pageSize: "10", search: "王", academicYearId: uuid });
  await service.createDocument("board-games", { page: "9", pageSize: "10", search: "策略", category: uuid, status: "available", orderBy: "name", orderDirection: "asc" });
  await service.createDocument("borrowings", { page: "9", pageSize: "10", search: "策略", status: "returned", orderBy: "returned_at", orderDirection: "asc" });
  await service.createDocument("event-attendance", { page: "9", pageSize: "10", eventId: uuid, search: "王", orderDirection: "asc" });

  for (const options of Object.values(calls)) {
    assert.equal(options.page, 1);
    assert.equal(options.pageSize, 1000);
    assert.equal(options.maxPageSize, 1000);
  }
  assert.equal(calls.users.search, "王");
  assert.equal(calls.memberships.academic_year_id, uuid);
  assert.equal(calls.officers.academicYearId, uuid);
  assert.equal(calls["board-games"].status, "available");
  assert.equal(calls.borrowings.orderBy, "returned_at");
  assert.equal(calls["event-attendance"].search, "王");
});
