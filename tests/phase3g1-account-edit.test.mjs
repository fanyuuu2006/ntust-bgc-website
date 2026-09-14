import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from './helpers/load-app-module.mjs';
import { readFileSync } from 'node:fs';

const schema = load('src/services/users/users.schema.tsx').updateUserAccountSchema;
test('account schema accepts trimmed name and avatar clearing', () => {
  assert.deepEqual(schema.parse({ name: ' 社員 ', avatar: null }), { name: '社員', avatar: null });
});
test('account schema rejects unsafe avatar URLs and sensitive fields', () => {
  for (const avatar of ['not a url', 'javascript:alert(1)', 'data:image/png;base64,abc', 'https://user:pass@example.com/a']) assert.equal(schema.safeParse({ avatar }).success, false);
  for (const key of ['email', 'email_verified_at', 'closed_at', 'password']) assert.equal(schema.safeParse({ name: 'name', [key]: 'forged' }).success, false);
});
test('shared account update rejects closed accounts before writing', async () => {
  let writes = 0;
  const service = load('src/services/users/users.service.tsx', {
    '@/libs/supabase/server': { supabase: {} },
    '@/repositories/users.repository': { usersRepository: { findById: async () => ({ closed_at: '2026-09-14' }), updateById: async () => { writes++; return {}; } } },
  }).usersService;
  await assert.rejects(() => service.updateAccount('id', { name: 'new' }));
  assert.equal(writes, 0);
});
test('shared account update persists name, avatar and clearing with canonical validation', async () => {
  const writes = [];
  const service = load('src/services/users/users.service.tsx', {
    '@/libs/supabase/server': { supabase: {} },
    '@/repositories/users.repository': { usersRepository: { findById: async () => ({ closed_at: null }), updateById: async (...args) => { writes.push(args); return {}; } } },
  }).usersService;
  await service.updateAccount('id', { name: ' 新名稱 ', avatar: 'https://example.com/a.png' });
  await service.updateAccount('id', { avatar: null });
  assert.deepEqual(writes, [['id', { name: '新名稱', avatar: 'https://example.com/a.png' }], ['id', { avatar: null }]]);
  await assert.rejects(() => service.updateAccount('id', { name: '' }));
  assert.equal(writes.length, 2);
});
test('admin account route authorizes before invoking the shared service', async () => {
  for (const allowed of [false, true]) {
    const calls = [];
    const PATCH = load('src/app/api/admin/users/[id]/account/route.ts', {
      '@/libs/api/admin-authorization': { authorizeAdminRequest: async () => ({ response: allowed ? null : Response.json({}, { status: 403 }) }) },
      '@/services/users/users.service': { usersService: { updateAccount: async (...args) => { calls.push(args); return { name: 'new' }; } } },
    }).PATCH;
    const response = await PATCH(new Request('http://localhost/api/admin/users/id/account', { method: 'PATCH', body: JSON.stringify({ name: 'new' }) }), { params: Promise.resolve({ id: 'id' }) });
    assert.equal(response.status, allowed ? 200 : 403);
    assert.deepEqual(calls, allowed ? [['id', { name: 'new' }]] : []);
  }
});
test('closure entry and confirmation are danger actions with concise copy', () => {
  const source = readFileSync('src/components/(authenticated)/settings/AccountClosureSection.tsx', 'utf8');
  assert.equal((source.match(/variant="danger"/g) ?? []).length, 2);
  assert.match(source, /永久停用此帳號/);
  assert.doesNotMatch(source, /送出時系統會再次確認/);
});
