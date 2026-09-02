import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the header keeps public discovery navigation after authentication", async () => {
  const [navigation, header, mobile] = await Promise.all([
    readSource("src/libs/navigation.tsx"),
    readSource("src/components/Header/Header.tsx"),
    readSource("src/components/Header/MobileNavigation.tsx"),
  ]);

  assert.match(navigation, /publicNavigation/);
  assert.doesNotMatch(navigation, /memberNavigation/);
  assert.match(header, /items=\{publicNavigation\}/);
  assert.doesNotMatch(mobile, /ButtonLink|href="\/login"|isAuthenticated/);
  assert.doesNotMatch(mobile, /user\.name|user\.email|UserAvatar/);
  assert.match(navigation, /label: "公告"/);
  assert.match(navigation, /label: "桌遊"/);
});

test("HeaderActions owns the single primary login action and registration remains in the auth flow", async () => {
  const [actions, mobile, login, register] = await Promise.all([
    readSource("src/components/Header/HeaderActions.tsx"),
    readSource("src/components/Header/MobileNavigation.tsx"),
    readSource("src/components/(auth)/login/LoginForm.tsx"),
    readSource("src/components/(auth)/register/RegisterForm.tsx"),
  ]);

  assert.match(actions, /href="\/login"/);
  assert.match(actions, /variant="primary"/);
  assert.doesNotMatch(actions, /href="\/register"/);
  assert.doesNotMatch(mobile, /href="\/login"|href="\/register"/);
  assert.match(login, /registerHref/);
  assert.match(register, /loginHref/);
});

test("UserMenu uses a flat member-first link list with secondary admin and a menu-row logout action", async () => {
  const [menu, navigation] = await Promise.all([
    readSource("src/components/Header/UserMenu.tsx"),
    readSource("src/libs/navigation.tsx"),
  ]);

  assert.match(navigation, /memberMenuNavigation/);
  assert.match(menu, /items=\{memberMenuNavigation\}/);
  assert.match(menu, /items=\{adminNavigation\}/);
  assert.match(menu, /isAdmin/);
  assert.match(menu, /variant="ghost"/);
  assert.match(menu, /text-\(--status-danger\)/);
  assert.doesNotMatch(menu, /MenuGroup|clubNavigation|accountNavigation/);
  assert.doesNotMatch(menu, /membership\.type|lifetime/);
  assert.match(menu, /user\.name/);
  assert.match(menu, /user\.email/);
});
