import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("WebsiteShell provides the application landmark and a keyboard skip link", async () => {
  const source = await readSource("src/components/layouts/WebsiteShell.tsx");

  assert.match(source, /href="#main-content"/);
  assert.match(source, /id="main-content"/);
  assert.match(source, /<Header/);
  assert.doesNotMatch(source, /"use client"/);
});

test("navigation keeps public discovery primary and exposes member routes through the account menu", async () => {
  const [navigation, header, desktop, mobile] = await Promise.all([
    readSource("src/libs/navigation.tsx"),
    readSource("src/components/Header/Header.tsx"),
    readSource("src/components/Header/DesktopNavigation.tsx"),
    readSource("src/components/Header/MobileNavigation.tsx"),
  ]);

  assert.match(navigation, /publicNavigation/);
  assert.match(navigation, /memberMenuNavigation/);
  assert.doesNotMatch(navigation, /memberNavigation/);
  assert.match(header, /items=\{publicNavigation\}/);
  assert.match(desktop, /aria-current/);
  assert.match(mobile, /aria-current/);
  assert.match(mobile, /variant="ghost"/);
});

test("Header uses one responsive composition with a centered mobile brand and right-side desktop actions", async () => {
  const header = await readSource("src/components/Header/Header.tsx");

  assert.match(header, /grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/);
  assert.match(header, /md:flex/);
  assert.match(header, /max-w-\[42vw\]/);
  assert.match(header, /md:mr-auto/);
  assert.match(header, /hidden text-xs text-\(--muted\) md:block/);
  assert.match(header, /<div className="shrink-0 justify-self-end">\s*<HeaderActions/);
  assert.match(header, /<MobileNavigation[\s\S]*?<div className="min-w-0 max-w-\[42vw\] justify-self-center/);
  assert.match(header, /<DesktopNavigation[\s\S]*?<HeaderActions/);
  assert.doesNotMatch(header, /<DesktopNavigation[^>]*className=|<HeaderActions[^>]*className=/);
  assert.doesNotMatch(header, /DesktopHeader|MobileHeader/);
});

test("account navigation stays flat, keeps admin secondary, and never derives it from membership type", async () => {
  const [menu, navigation] = await Promise.all([
    readSource("src/components/Header/UserMenu.tsx"),
    readSource("src/libs/navigation.tsx"),
  ]);

  assert.match(menu, /memberMenuNavigation/);
  assert.match(menu, /isAdmin/);
  assert.doesNotMatch(menu, /membership\.type|lifetime/);
  assert.match(navigation, /adminNavigation/);
  assert.doesNotMatch(menu, /MenuGroup|clubNavigation|accountNavigation/);
  assert.match(menu, /variant="ghost"/);
});

test("current-user lookup is request memoized without a client-side auth fetch", async () => {
  const source = await readSource("src/libs/auth.tsx");

  assert.match(source, /import \{ cache \} from "react"/);
  assert.match(source, /export const getCurrentUser = cache\(async \(\)/);
  assert.doesNotMatch(source, /fetch\(/);
});

test("member shell pages do not introduce nested main landmarks", async () => {
  const [home, settings] = await Promise.all([
    readSource("src/app/(public)/page.tsx"),
    readSource("src/app/(authenticated)/settings/page.tsx"),
  ]);

  assert.doesNotMatch(home, /<main/);
  assert.doesNotMatch(settings, /<main/);
});
