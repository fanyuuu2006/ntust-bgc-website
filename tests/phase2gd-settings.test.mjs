import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("settings presents two focused account and security surfaces without blanking on a missing profile", async () => {
  const page = await readSource("src/app/(authenticated)/settings/page.tsx");

  assert.match(page, /PageHeader/);
  assert.match(page, /title="帳號與個人資料"/);
  assert.match(page, /title="安全性"/);
  assert.match(page, /profile \?/);
  assert.match(page, /個人資料暫時無法載入/);
  assert.doesNotMatch(page, /if \(!profile\) return null/);
  assert.doesNotMatch(page, /會員|社員資格|社團足跡|借用/);
});

test("authenticated profile update uses an explicit strict six-field self-service boundary", async () => {
  const [schema, service, route] = await Promise.all([
    readSource("src/services/users/users.schema.tsx"),
    readSource("src/services/users/users.service.tsx"),
    readSource("src/app/api/users/me/profile/route.ts"),
  ]);

  assert.match(
    schema,
    /updateSelfProfileSchema[\s\S]*real_name[\s\S]*phone[\s\S]*student_id[\s\S]*school[\s\S]*department[\s\S]*grade[\s\S]*\.strict\(\)/,
  );
  assert.doesNotMatch(schema, /updateSelfProfileSchema[\s\S]*user_id/);
  assert.match(service, /updateSelfProfileSchema\.parse\(payload\)/);
  assert.match(route, /usersService\.updateSelfProfile\(user\.id, body\)/);
  assert.doesNotMatch(route, /updateAcademicProfile/);
});

test("account settings separates editable username and avatar from read-only email", async () => {
  const account = await readSource(
    "src/components/(authenticated)/settings/AccountSettingsForm.tsx",
  );

  assert.match(account, /使用者名稱/);
  assert.match(account, /UserAvatar/);
  assert.match(account, /avatar/);
  assert.match(account, /aria-readonly="true"/);
  assert.match(account, /Email 為登入帳號，目前無法修改/);
  assert.doesNotMatch(account, /emailField|disabled:\s*true/);
  assert.match(account, /variant="primary"/);
  assert.match(account, /FormFeedback/);
});

test("personal settings edits all six supported profile fields through the self profile endpoint", async () => {
  const profile = await readSource(
    "src/components/(authenticated)/settings/ProfileSettingsForm.tsx",
  );

  for (const field of [
    "real_name",
    "phone",
    "student_id",
    "school",
    "department",
    "grade",
  ]) {
    assert.match(profile, new RegExp(`id: "${field}"`));
  }
  assert.match(profile, /\/api\/users\/me\/profile/);
  assert.match(profile, /variant="primary"/);
  assert.match(profile, /FormFeedback/);
  assert.doesNotMatch(profile, /如需修改請聯絡社團幹部|disabled:\s*true/);
});

test("session management confirms destructive revocation and reports successful mutations", async () => {
  const sessions = await readSource(
    "src/components/(authenticated)/settings/SessionList.tsx",
  );

  assert.match(sessions, /ConfirmDialog/);
  assert.match(sessions, /確認撤銷登入工作階段/);
  assert.match(sessions, /確認撤銷其他登入工作階段/);
  assert.match(sessions, /variant="danger"/);
  assert.match(sessions, /已撤銷登入工作階段/);
  assert.match(sessions, /已撤銷其他登入工作階段/);
  assert.match(sessions, /success=/);
  assert.match(sessions, /目前使用中/);
  assert.match(sessions, /formatDateTime/);
});
