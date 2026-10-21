import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("settings index delegates to route-based categories without loading account data", async () => {
  const page = await readSource("src/app/(authenticated)/settings/page.tsx");

  assert.match(page, /SettingsCategoryList/);
  assert.doesNotMatch(page, /getCurrentUser|usersService|authService/);
});

test("authenticated profile update uses an explicit strict five-field self-service boundary", async () => {
  const [schema, service, route] = await Promise.all([
    readSource("src/services/users/users.schema.tsx"),
    readSource("src/services/users/users.service.tsx"),
    readSource("src/app/api/users/me/profile/route.ts"),
  ]);

  assert.match(
    schema,
    /selfEditableProfileFields[\s\S]*phone[\s\S]*userAcademicFields/,
  );
  assert.match(
    schema,
    /updateSelfProfileSchema[\s\S]*object\(selfEditableProfileFields\)[\s\S]*\.strict\(\)/,
  );
  const selfSchema = schema.match(
    /updateSelfProfileSchema[\s\S]*?(?=export const updateUserProfileSchema)/,
  )?.[0];
  assert.ok(selfSchema);
  assert.doesNotMatch(selfSchema, /real_name/);
  assert.doesNotMatch(schema, /updateSelfProfileSchema[\s\S]*user_id/);
  assert.match(service, /updateSelfProfileSchema\.parse\(payload\)/);
  assert.match(route, /usersService\.updateSelfProfile\(user\.id, body\)/);
  assert.doesNotMatch(route, /updateAcademicProfile/);
});

test("profile and account settings separate editable identity from read-only email", async () => {
  const [account, email] = await Promise.all([
    readSource("src/components/(authenticated)/settings/AccountSettingsForm.tsx"),
    readSource("src/components/(authenticated)/settings/AccountEmailSection.tsx"),
  ]);

  assert.match(account, /使用者名稱/);
  assert.match(account, /AvatarSettingsSection/);
  assert.doesNotMatch(account, /avatarField|values\.avatar/);
  assert.doesNotMatch(account, /aria-readonly="true"|ResendEmailVerificationButton/);
  assert.match(email, /aria-readonly="true"/);
  assert.match(email, /Email 為登入帳號，目前無法修改/);
  assert.match(email, /Email 已驗證|Email 尚未驗證/);
  assert.doesNotMatch(account, /emailField|disabled:\s*true/);
  assert.match(account, /variant="primary"/);
  assert.match(account, /FormFeedback/);
});

test("personal settings keeps real name read-only and edits only self-service profile fields", async () => {
  const profile = await readSource(
    "src/components/(authenticated)/settings/ProfileSettingsForm.tsx",
  );

  for (const field of [
    "phone",
    "student_id",
    "school",
    "department",
    "grade",
  ]) {
    assert.match(profile, new RegExp(`id: "${field}"`));
  }
  assert.doesNotMatch(profile, /id: "real_name"/);
  assert.match(profile, /profile\.real_name/);
  assert.match(profile, /如需更正真實姓名，請聯絡社團幹部。/);
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
