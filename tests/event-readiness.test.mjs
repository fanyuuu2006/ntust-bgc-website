import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { load } from './helpers/load-app-module.mjs';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const errors = load('src/services/events/events.errors.ts');
const repositoryErrors = load('src/repositories/shared/errors.ts');
const userId = '00000000-0000-4000-8000-000000000001';
const event = { id: '1', check_in_opens_at: '2020-01-01', check_in_closes_at: '2030-01-01' };

function checkInFixture({ member = true, currentEvent = event, failure } = {}) {
  let inserts = 0;
  const rows = new Map();
  const supabase = createClient('https://fixture.invalid', 'sb_secret_test_fixture', {
    auth: { persistSession: false },
    global: { fetch: async (input, init) => {
      assert.equal(new URL(input).pathname, '/rest/v1/event_attendances');
      assert.equal(init.method, 'POST', 'no attendance pre-read or retry');
      inserts++;
      if (failure) return Response.json(failure, { status: 503 });
      const data = JSON.parse(init.body);
      const key = `${data.event_id}/${data.user_id}`;
      // 模擬 DB unique constraint 原子裁決；真正 constraint 另外由 schema regression 保護。
      if (rows.has(key)) return Response.json({ code: '23505', message: 'duplicate key value violates unique constraint' }, { status: 409 });
      rows.set(key, data);
      return Response.json({ id: 1, ...data }, { status: 201 });
    } },
  });
  const service = load('src/services/events/events.service.ts', {
    '@/libs/supabase/server': { supabase },
    '@/repositories/shared/errors': repositoryErrors,
    './events.errors': errors,
    '@/repositories/events.repository': { eventsRepository: { findById: async () => currentEvent } },
    '@/services/memberships/memberships.service': { membershipService: { isCurrentActiveMember: async () => member } },
  }).eventsService;
  const route = load('src/app/api/events/[id]/check-in/route.ts', {
    '@/services/events/events.service': { eventsService: service },
    '@/services/events/events.errors': errors,
    '@/libs/api/verified-authorization': { authorizeVerifiedRequest: async () => ({ user: { id: userId } }) },
    '@/libs/api/server-response': { unexpectedErrorResponse: () => Response.json({ message: 'unavailable' }, { status: 503 }) },
  });
  return { run: () => route.POST(new Request('https://fixture.invalid', { method: 'POST' }), { params: Promise.resolve({ id: '1' }) }), rows, inserts: () => inserts };
}

test('concurrent and repeated check-in yields one row, 201/409, never a raw database error', async () => {
  const f = checkInFixture();
  const responses = await Promise.all([f.run(), f.run()]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  const duplicate = responses.find(r => r.status === 409);
  const body = await duplicate.json();
  assert.doesNotMatch(JSON.stringify(body), /23505|constraint|user_id/);
  assert.equal((await f.run()).status, 409);
  assert.equal(f.rows.size, 1);
  assert.equal(f.inserts(), 3);
});

test('membership, missing event and closed window still block before writing', async () => {
  for (const [options, status] of [
    [{ member: false }, 403], [{ currentEvent: null }, 404],
    [{ currentEvent: { ...event, check_in_closes_at: '2020-01-01' } }, 409],
  ]) {
    const f = checkInFixture(options);
    assert.equal((await f.run()).status, status);
    assert.equal(f.inserts(), 0);
  }
});

test('check-in infrastructure failure is not duplicated or converted to success', async () => {
  const f = checkInFixture({ failure: { code: 'PGRST000', message: 'unavailable' } });
  assert.equal((await f.run()).status, 503);
  assert.equal(f.inserts(), 1);
  assert.equal(f.rows.size, 0);
});

test('academic year cache shares an in-flight render lookup and resets at the next request', async () => {
  const react = require(join(dirname(require.resolve('react/package.json')), 'cjs/react.react-server.development.js'));
  const internals = react.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const original = internals.A;
  let calls = 0, year = '115';
  const { getCurrentAcademicYear } = load('src/services/academic-years/current-academic-year.ts', {
    react,
    '@/repositories/academic-years.repository': { academicYearsRepository: { findCurrent: async () => { calls++; return { year }; } } },
  });
  const scope = () => {
    const cache = new Map();
    internals.A = { getCacheForType(factory) { if (!cache.has(factory)) cache.set(factory, factory()); return cache.get(factory); } };
  };
  try {
    scope();
    const a = getCurrentAcademicYear(), b = getCurrentAcademicYear();
    assert.equal(a, b);
    await Promise.all([a, b]);
    assert.equal(calls, 1);
    year = '116';
    scope();
    assert.equal((await getCurrentAcademicYear()).year, '116');
    assert.equal(calls, 2);
    internals.A = null;
    await getCurrentAcademicYear(); await getCurrentAcademicYear();
    assert.equal(calls, 4, 'outside RSC there is no process-global authorization cache');
  } finally { internals.A = original; }
});

test('health uses one zero-row probe without auth; failures return only degraded status', async () => {
  for (const fails of [false, true]) {
    let calls = 0;
    const supabase = createClient('https://fixture.invalid', 'sb_secret_test_fixture', {
      auth: { persistSession: false },
      global: { fetch: async (input, init) => {
        calls++;
        const url = new URL(input);
        assert.equal(url.pathname, '/rest/v1/academic_years');
        assert.equal(url.searchParams.get('select'), 'id');
        assert.equal(url.searchParams.get('limit'), '0');
        assert.ok(init.signal);
        if (fails) throw new Error('fixture network failure');
        return Response.json([]);
      } },
    });
    const { GET } = load('src/app/api/health/route.ts', { '@/libs/supabase/server': { supabase } });
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { app: 'ok', database: fails ? 'degraded' : 'ok' });
    assert.equal(calls, 1);
  }
});

test('dashboard keeps group priority, total limit and empty-state behavior without game enrichment', async () => {
  const groups = {
    borrowed: [{ id: 1, board_game: { name: 'due soon' } }, { id: 2, board_game: { name: 'later' } }],
    approved: [{ id: 3, board_game: { name: 'approved' } }, { id: 4, board_game: { name: 'later approval' } }],
    pending: [{ id: 5, board_game: { name: 'pending' } }],
  };
  const { boardGamesService } = load('src/services/board-games/board-games.service.ts', {
    '@/libs/supabase/server': { supabase: {} },
    '@/libs/cache/public-data': { cachePublicData: (_, fn) => fn },
    '@/repositories/board-games.repository': { boardGamesRepository: { findManyByIds: () => { throw new Error('unnecessary enrichment'); } } },
    '@/repositories/board-game-borrowings.repository': { boardGameBorrowingsRepository: {
      findManyByUserIdWithGame: async (_, options, count) => {
        assert.equal(options.pageSize, 3);
        assert.equal(count, false);
        return { data: groups[options.status] };
      },
    } },
  });
  assert.deepEqual((await boardGamesService.getDashboardOpenBorrowingsByUserId(userId)).map(r => r.id), [1, 2, 3]);
  groups.borrowed = [];
  assert.deepEqual((await boardGamesService.getDashboardOpenBorrowingsByUserId(userId)).map(r => r.id), [3, 4, 5]);
  groups.approved = []; groups.pending = [];
  assert.deepEqual(await boardGamesService.getDashboardOpenBorrowingsByUserId(userId), []);
});
