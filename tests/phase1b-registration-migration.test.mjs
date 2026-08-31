import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("registration migration creates users, credentials, and required profile in one hardened RPC", async () => {
  const sql = await readProjectFile(
    "supabase/migrations/202609010003_make_registration_atomic.sql",
  );

  assert.match(sql, /create function public\.register_user\([\s\S]*p_real_name text,[\s\S]*p_phone text/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /insert into public\.users/);
  assert.match(sql, /insert into public\.auth_credentials/);
  assert.match(sql, /insert into public\.user_profiles \(user_id, real_name, phone\)/);
  assert.match(sql, /drop function public\.register_user\(text, text, text\)/);
  assert.match(sql, /grant execute on function public\.register_user\(text, text, text, text, text\) to service_role/);
  assert.doesNotMatch(sql, /grant execute on function public\.register_user[\s\S]*\b(?:public|anon|authenticated)\b/);
});

test("registration source passes profile data to the transactional RPC without a second profile write", async () => {
  const repository = await readProjectFile("src/repositories/auth.repository.tsx");
  const service = await readProjectFile("src/services/auth/auth.service.tsx");

  assert.match(repository, /p_real_name: realName/);
  assert.match(repository, /p_phone: phone/);
  assert.match(service, /realName: data\.real_name/);
  assert.match(service, /phone: data\.phone/);
  assert.match(service, /if \(isUniqueViolation\(error\)\) throw new EmailAlreadyExistsError\(\)/);
  assert.doesNotMatch(service, /usersService\.createProfile/);
});
