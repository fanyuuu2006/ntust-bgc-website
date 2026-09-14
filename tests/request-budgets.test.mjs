import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { load } from "./helpers/load-app-module.mjs";
import { createPublicCacheRuntime } from "./helpers/next-public-cache.mjs";

const cacheRuntime = createPublicCacheRuntime();
const require = createRequire(import.meta.url);
const dedupePath = require.resolve("next/dist/server/lib/dedupe-fetch.js");
const requireNext = createRequire(dedupePath);
const moduleFixture = { exports: {} };
const requestCaches = [];
// 使用已安裝的 Next dedupe；React dispatcher 由單一量測範圍的 memo 取代。
function requestCache(fn) {
  const entries = new Map();
  requestCaches.push(entries);
  return (...args) => {
    const key = JSON.stringify(args);
    if (!entries.has(key)) entries.set(key, fn(...args));
    return entries.get(key);
  };
}
new Function("require", "module", "exports", readFileSync(dedupePath, "utf8"))(
  (name) => name === "react" ? { cache: requestCache } : requireNext(name),
  moduleFixture, moduleFixture.exports,
);
const { createDedupeFetch } = moduleFixture.exports;
const id = "00000000-0000-4000-8000-000000000001";
let requests = [], mode = "read";
const row = {
  id, user_id: id, category_id: id, location_id: id, board_game_id: id,
  academic_year_id: id, event_id: id,
  name: "fixture", email: "fixture@example.invalid", email_verified_at: "2026-01-01",
  closed_at: null, status: "active", type: "annual", year: "115", is_current: true,
  start_date: "2026-01-01", end_date: "2027-01-01", joined_at: "2026-01-01",
  created_at: "2026-01-01", expires_at: "2030-01-01",
  last_accessed_at: new Date().toISOString(), title: "fixture",
  completed_borrow_count: 1, password_hash: "fixture", inventory_number: 1,
  check_in_opens_at: "2020-01-01", check_in_closes_at: "2030-01-01",
};
const { createSupabaseFetch } = load("src/libs/supabase/fetch.ts");
async function dataApiFixture(input, init) {
  const url = new URL(input);
  const method = init?.method || "GET";
  const table = url.pathname.split("/").pop();
  const headers = new Headers(init?.headers);
  requests.push({ table, method, query: url.search, signal: !!init?.signal, headers: [...headers] });
  const data = { ...row, category: { name: "category" }, location: { name: "location" } };
  data.board_game = { id, name: 'fixture', image: null, inventory_number: 1 };
  if (table === "board_games" || table === "board_games_with_statistics") data.status = "available";
  if (table === "board_game_borrowings") data.status = "borrowed";
  let body = url.searchParams.get("limit") === "0" ? [] : headers.get("accept")?.includes("object") ? data : [data];
  if (mode === "register" && table === "users") body = [];
  if (mode === "checkin" && table === "event_attendances" && method === "GET") body = [];
  if (table === "register_user") body = { ...row, email_verified_at: null };
  if (table === "issue_email_verification_token") body = "issued";
  return Response.json(body, {
    headers: { "content-range": mode === "register" && table === "users" ? "*/0" : "0-0/1" },
  });
}
const supabase = createClient("https://fixture.invalid", "sb_secret_budget_fixture", {
  auth: { persistSession: false },
  global: { fetch: createSupabaseFetch(createDedupeFetch(dataApiFixture)) },
});
const mocks = {
  "next/cache": cacheRuntime.module,
  "@/libs/supabase/server": { supabase },
  "@/utils/auth/password": { verifyPassword: async () => true, hashPassword: async () => "fixture" },
  "@/libs/siteConfigs": { siteConfigs: { url: "https://fixture.invalid" } },
  "@/libs/email/sender": { getTransactionalEmailSender: () => ({ send: async () => {} }) },
};
const get = (path, name) => load(path, mocks)[name];
const a = get("src/services/auth/auth.service.tsx", "authService");
const g = get("src/services/board-games/board-games.service.ts", "boardGamesService");
const e = get("src/services/events/events.service.ts", "eventsService");
const p = get("src/services/profile/profile.service.ts", "profileService");
const u = get("src/services/users/users.service.tsx", "usersService");
const n = get("src/services/announcements/announcements.service.ts", "announcementsService");
const v = get("src/services/email-verification/email-verification.service.ts", "emailVerificationService");
const m = get("src/services/memberships/memberships.service.ts", "membershipService");
const currentYear = get("src/services/academic-years/current-academic-year.ts", "getCurrentAcademicYear");
const isAdmin = get("src/libs/auth.tsx", "isAdminByUserId");
async function measure(fn, fixtureMode = "read", cold = true) {
  if (cold) cacheRuntime.clear();
  requests = [];
  for (const entries of requestCaches) entries.clear();
  mode = fixtureMode;
  await fn();
  return requests.length;
}
// 對應現有 layout 的 cached current-user 呼叫一次，再檢查管理導覽權限。
const guard = async () => { await a.getUserBySessionToken("fixture"); await isAdmin(id); };
const home = async () => { await n.getHomepagePreview(); await g.listPopularBoardGames({ limit: 6 }); };
const DashboardPage = load('src/app/(authenticated)/dashboard/page.tsx', {
  ...mocks,
  '@/libs/auth': { getCurrentUser: async () => row },
  '@/libs/observability/server-render': { withServerErrorReference: (fn) => fn },
  '@/services/academic-years/current-academic-year': { getCurrentAcademicYear: currentYear },
  '@/services/memberships/memberships.service': { membershipService: m },
  '@/services/board-games/board-games.service': { boardGamesService: g },
  '@/services/events/events.service': { eventsService: e },
  '@/services/announcements/announcements.service': { announcementsService: n },
}).default;
const dashboard = async () => {
  await guard();
  await DashboardPage();
};
const checkin = async () => { await a.getUserBySessionToken('fixture'); await e.selfCheckIn(id, id); };
test('B3 event path request budgets', async () => {
  const dashboardCount = await measure(dashboard);
  const checkinCount = await measure(checkin, 'checkin');
  const borrowingsCount = await measure(async () => { await guard(); await g.getBorrowingsByUserId(id); });
  assert.deepEqual({ dashboardCount, checkinCount, combined: dashboardCount + checkinCount, borrowingsCount },
    { dashboardCount: 11, checkinCount: 6, combined: 17, borrowingsCount: 4 });
});

test('B3 warm dashboard reuses only public announcements, including after check-in', async () => {
  await measure(dashboard);
  assert.equal(await measure(dashboard, 'read', false), 10);
  const mutation = await measure(checkin, 'checkin', false);
  const refresh = await measure(dashboard, 'read', false);
  assert.equal(mutation, 6);
  assert.equal(refresh, 10);
  assert.equal(mutation + refresh, 16);
});

test('B3 borrowed/approved/pending preserve independent bounds and narrow related games', async () => {
  await measure(() => g.getDashboardOpenBorrowingsByUserId(id));
  assert.equal(requests.length, 3);
  for (const [index, status] of ['borrowed', 'approved', 'pending'].entries()) {
    const request = requests[index];
    assert.equal(request.table, 'board_game_borrowings');
    const q = new URLSearchParams(request.query);
    assert.equal(q.get('user_id'), `eq.${id}`);
    assert.equal(q.get('status'), `eq.${status}`);
    assert.equal(q.get('limit'), '3');
    assert.equal(q.get('order'), `${index === 0 ? 'due_at' : 'created_at'}.asc`);
    assert.match(q.get('select'), /board_game:board_games\(id,name,inventory_number,image\)/);
    assert.doesNotMatch(q.get('select'), /\*|rich_description|approved_by_user_id/);
    assert.ok(!request.headers.some(([key, value]) => key === 'prefer' && value.includes('count')));
  }
});

test('B3 personal borrowings retain count, search/filter/pagination; events omit Rich Content payload', async () => {
  await measure(() => g.getBorrowingsByUserId(id, { page: 2, pageSize: 12, status: ['pending', 'approved'], search: 'fixture' }));
  assert.equal(requests.length, 2, 'search still requires the game-ID search, without subsequent enrichment');
  const q = new URLSearchParams(requests[1].query);
  assert.equal(q.get('offset'), '12');
  assert.equal(q.get('limit'), '12');
  assert.equal(q.get('status'), 'in.(pending,approved)');
  assert.equal(q.get('board_game_id'), `in.(${id})`);
  assert.equal(q.get('order'), 'created_at.desc');
  assert.ok(requests[1].headers.some(([key, value]) => key === 'prefer' && value.includes('count=exact')));
  await measure(() => e.getSelfCheckInEventsForUser(id));
  assert.deepEqual(requests.map(r => new URLSearchParams(r.query).get('select')), ['id,name,start_time,end_time', 'event_id']);
});

test('B1 reduced cold request budgets', async () => {
    const measured = {
        home: await measure(home),
        authHome: await measure(async () => { await guard(); await home(); }),
        publicGames: await measure(async () => { await g.listCategories(); await g.listLocations(); await g.listBoardGameDiscovery(); }),
        adminGames: await measure(async () => { await guard(); await g.listAdminBoardGamesWithCategoryAndLocation(); await g.listCategories(); await g.listLocations(); }),
        profile: await measure(async () => { await guard(); await u.getProfile(id); await g.getTotalBorrowedCount(id); await e.getAttendedCountByCurrentAcademicYear(id); await p.getClubContext(id); }),
        register: await measure(async () => { const user = await a.register({ email: 'fixture@example.invalid', password: 'Password123!', name: 'fixture', real_name: 'fixture', phone: '0912345678' }); await v.request(user); }, 'register')
    };
    assert.deepEqual(measured, { home: 2, authHome: 5, publicGames: 3, adminGames: 6, profile: 10, register: 2 });
});
test('B2 warm cache only removes public reads; private guards and mutations still query', async () => {
    const cases = [
        [home, 0],
        [async () => { await guard(); await home(); }, 3],
        [async () => { await g.listCategories(); await g.listLocations(); await g.listBoardGameDiscovery(); }, 1],
        [async () => { await guard(); await g.listAdminBoardGamesWithCategoryAndLocation(); await g.listCategories(); await g.listLocations(); }, 4],
        [async () => { await guard(); await u.getProfile(id); await g.getTotalBorrowedCount(id); await e.getAttendedCountByCurrentAcademicYear(id); await p.getClubContext(id); }, 10],
    ];
    for (const [fn, expected] of cases) {
        await measure(fn);
        assert.equal(await measure(fn, 'read', false), expected);
    }
});
test('homepage projections omit detail payload and pagination counts', async () => {
    await measure(home);
    assert.equal(requests.length, 2);
    for (const request of requests) {
        const query = new URLSearchParams(request.query);
        assert.doesNotMatch(query.get('select'), /\*|rich_content|rich_description|author_id|updated_at/);
        assert.ok(!request.headers.some(([key, value]) => key === 'prefer' && value.includes('count=exact')));
    }
    assert.equal(new URLSearchParams(requests[0].query).get('limit'), '3');
    assert.equal(new URLSearchParams(requests[1].query).get('limit'), '6');
});
test('discovery keeps search/filter/order/count/range in the single result query', async () => {
    await measure(() => g.listBoardGameDiscovery({ page: 2, pageSize: 12, search: '42', status: 'available', category_ids: [id], location_ids: [id], orderBy: 'name', orderDirection: 'asc' }));
    assert.equal(requests.length, 1);
    const q = new URLSearchParams(requests[0].query);
    assert.match(q.get('select'), /category:board_game_categories\(name\)/);
    assert.match(q.get('select'), /location:board_game_locations\(name\)/);
    assert.doesNotMatch(q.get('select'), /\*|rich_description|description|updated_at/);
    assert.equal(q.get('status'), 'eq.available');
    assert.equal(q.get('category_id'), `in.(${id})`);
    assert.equal(q.get('location_id'), `in.(${id})`);
    assert.match(q.get('or'), /42/);
    assert.equal(q.get('order'), 'name.asc,id.asc');
    assert.equal(q.get('offset'), '12');
    assert.equal(q.get('limit'), '12');
    assert.ok(requests[0].headers.some(([key, value]) => key === 'prefer' && value === 'count=exact'));
});

test('admin result query retains management fields, filters and pagination without lookup fan-out', async () => {
    await measure(() => g.listAdminBoardGamesWithCategoryAndLocation({ page: 2, pageSize: 10, search: '42', categoryId: id, locationId: id, status: 'available', orderBy: 'inventory_number', orderDirection: 'asc' }));
    assert.equal(requests.length, 1);
    const q = new URLSearchParams(requests[0].query);
    assert.match(q.get('select'), /^\*,category:/);
    assert.match(q.get('select'), /location:board_game_locations/);
    assert.equal(q.get('category_id'), `in.(${id})`);
    assert.equal(q.get('location_id'), `in.(${id})`);
    assert.equal(q.get('status'), 'eq.available');
    assert.equal(q.get('order'), 'inventory_number.asc');
    assert.equal(q.get('offset'), '10');
    assert.equal(q.get('limit'), '10');
});

test('current-year attendance reuses the exact inclusive boundaries and statuses', async () => {
    await measure(() => e.getAttendedCountByCurrentAcademicYear(id));
    assert.equal(requests.length, 2);
    assert.deepEqual(requests.map((r) => r.table), ['academic_years', 'event_attendances']);
    const q = new URLSearchParams(requests[1].query);
    assert.deepEqual(q.getAll('events.start_time'), ['gte.2026-01-01', 'lte.2027-01-01']);
    assert.ok(q.get('status'));
});
