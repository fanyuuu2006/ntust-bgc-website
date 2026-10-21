import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("settings exposes an index and four route-backed categories from shared metadata", async () => {
  const [data, index, layout] = await Promise.all([
    readSource("src/components/(authenticated)/settings/settings-navigation-data.tsx"),
    readSource("src/app/(authenticated)/settings/page.tsx"),
    readSource("src/app/(authenticated)/settings/layout.tsx"),
  ]);

  for (const route of ["profile", "appearance", "security", "account"]) {
    assert.match(data, new RegExp(`href: "/settings/${route}"`));
    await readSource(`src/app/(authenticated)/settings/${route}/page.tsx`);
    await readSource(`src/app/(authenticated)/settings/${route}/loading.tsx`);
  }
  assert.match(index, /SettingsCategoryList/);
  assert.match(layout, /SettingsNavigation/);
  assert.match(layout, /lg:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
});

test("responsive settings navigation uses real links, exact active state, and a mobile return path", async () => {
  const navigation = await readSource("src/components/(authenticated)/settings/SettingsNavigation.tsx");
  const categories = await readSource("src/components/(authenticated)/settings/SettingsCategoryList.tsx");

  assert.match(navigation, /usePathname/);
  assert.match(navigation, /pathname === item\.href/);
  assert.match(navigation, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(navigation, /hidden lg:block/);
  assert.match(navigation, /href="\/settings"[\s\S]*lg:hidden[\s\S]*返回設定/);
  assert.match(categories, /<Link[\s\S]*href=\{item\.href\}/);
  assert.match(categories, /aria-label="設定分類"/);
});

test("each settings route loads only the data required by its category", async () => {
  const [index, profile, appearance, security, account] = await Promise.all([
    readSource("src/app/(authenticated)/settings/page.tsx"),
    readSource("src/app/(authenticated)/settings/profile/page.tsx"),
    readSource("src/app/(authenticated)/settings/appearance/page.tsx"),
    readSource("src/app/(authenticated)/settings/security/page.tsx"),
    readSource("src/app/(authenticated)/settings/account/page.tsx"),
  ]);

  assert.doesNotMatch(index, /getCurrentUser|usersService|SessionSettingsSection/);
  assert.match(profile, /usersService\.getProfile/);
  assert.doesNotMatch(profile, /SessionSettingsSection|ThemeSelector|AccountClosureSection/);
  assert.match(appearance, /ThemeSelector/);
  assert.doesNotMatch(appearance, /getCurrentUser|usersService|SessionSettingsSection/);
  assert.match(security, /PasswordSettingsForm/);
  assert.match(security, /SessionSettingsSection/);
  assert.doesNotMatch(security, /usersService|ThemeSelector|AccountClosureSection/);
  assert.match(account, /AccountEmailSection/);
  assert.match(account, /AccountClosureSection/);
  assert.doesNotMatch(account, /usersService|SessionSettingsSection|ThemeSelector/);
});

test("profile edit entry points target the profile settings route", async () => {
  const [page, details] = await Promise.all([
    readSource("src/app/(authenticated)/profile/page.tsx"),
    readSource("src/components/(authenticated)/profile/ProfileDetailsSection.tsx"),
  ]);

  assert.match(page, /href="\/settings\/profile"/);
  assert.match(details, /href="\/settings\/profile"/);
  assert.doesNotMatch(page, /href="\/settings"[^/]/);
});

test("category pages preserve the existing forms and mutation contracts", async () => {
  const [profile, security, account, accountForm, profileForm, password, closure] = await Promise.all([
    readSource("src/app/(authenticated)/settings/profile/page.tsx"),
    readSource("src/app/(authenticated)/settings/security/page.tsx"),
    readSource("src/app/(authenticated)/settings/account/page.tsx"),
    readSource("src/components/(authenticated)/settings/AccountSettingsForm.tsx"),
    readSource("src/components/(authenticated)/settings/ProfileSettingsForm.tsx"),
    readSource("src/components/(authenticated)/settings/PasswordSettingsForm.tsx"),
    readSource("src/components/(authenticated)/settings/AccountClosureSection.tsx"),
  ]);

  assert.match(profile, /AccountSettingsForm/);
  assert.match(profile, /ProfileSettingsForm/);
  assert.match(security, /PasswordSettingsForm/);
  assert.match(account, /AccountClosureSection/);
  assert.match(accountForm, /\/api\/users\/me\/account/);
  assert.match(profileForm, /\/api\/users\/me\/profile/);
  assert.match(password, /\/api\/auth\/password/);
  assert.match(closure, /\/api\/users\/me\/closure/);
});
