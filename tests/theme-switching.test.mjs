import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("theme helpers validate all three preferences and resolve system safely", () => {
  const theme = load("src/libs/theme.ts");

  assert.equal(theme.THEME_STORAGE_KEY, "ntust-bgc-theme");
  assert.equal(theme.isThemePreference("system"), true);
  assert.equal(theme.isThemePreference("light"), true);
  assert.equal(theme.isThemePreference("dark"), true);
  assert.equal(theme.isThemePreference("invalid"), false);
  assert.equal(theme.isThemePreference(null), false);
  assert.equal(theme.resolveThemePreference("system", false), "light");
  assert.equal(theme.resolveThemePreference("system", true), "dark");
  assert.equal(theme.resolveThemePreference("dark", false), "dark");
});

test("initialization script runs before body content and applies a validated resolved theme", async () => {
  const { THEME_INITIALIZATION_SCRIPT } = load("src/libs/theme.ts");
  const layout = await readSource("src/app/layout.tsx");
  const headIndex = layout.indexOf("<head>");
  const bodyIndex = layout.indexOf("<body>");

  assert.ok(headIndex >= 0 && headIndex < bodyIndex);
  assert.match(layout, /suppressHydrationWarning/);
  assert.match(layout, /dangerouslySetInnerHTML=\{\{ __html: THEME_INITIALIZATION_SCRIPT \}\}/);

  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://example.test",
    runScripts: "outside-only",
  });
  dom.window.localStorage.setItem("ntust-bgc-theme", "dark");
  dom.window.matchMedia = () => ({ matches: false });
  dom.window.eval(THEME_INITIALIZATION_SCRIPT);
  assert.equal(dom.window.document.documentElement.dataset.theme, "dark");
  assert.equal(dom.window.document.documentElement.dataset.themePreference, "dark");

  dom.window.localStorage.setItem("ntust-bgc-theme", "invalid");
  dom.window.matchMedia = () => ({ matches: true });
  dom.window.eval(THEME_INITIALIZATION_SCRIPT);
  assert.equal(dom.window.document.documentElement.dataset.theme, "dark");
  assert.equal(dom.window.document.documentElement.dataset.themePreference, "system");
  dom.window.close();
});

test("ThemeProvider persists changes, follows system, handles storage events and tolerates storage errors", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", {
    url: "https://example.test",
    pretendToBeVisual: true,
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    StorageEvent: globalThis.StorageEvent,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  let dark = false;
  const listeners = new Set();
  dom.window.matchMedia = () => ({
    get matches() { return dark; },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.StorageEvent = dom.window.StorageEvent;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.localStorage.setItem("ntust-bgc-theme", "system");

  const { ThemeProvider, useTheme } = load("src/contexts/ThemeContext.tsx");
  let currentTheme;
  function Probe() {
    currentTheme = useTheme();
    return createElement("span", null, currentTheme.preference);
  }
  const reactRoot = createRoot(dom.window.document.getElementById("app"));

  try {
    await act(async () => reactRoot.render(createElement(ThemeProvider, null, createElement(Probe))));
    assert.equal(currentTheme.preference, "system");
    assert.equal(currentTheme.resolvedTheme, "light");

    await act(async () => currentTheme.setPreference("dark"));
    assert.equal(dom.window.localStorage.getItem("ntust-bgc-theme"), "dark");
    assert.equal(dom.window.document.documentElement.dataset.theme, "dark");

    await act(async () => currentTheme.setPreference("system"));
    dark = true;
    await act(async () => [...listeners].forEach((listener) => listener({ matches: true })));
    assert.equal(currentTheme.resolvedTheme, "dark");

    await act(async () => dom.window.dispatchEvent(new dom.window.StorageEvent("storage", {
      key: "ntust-bgc-theme",
      newValue: "light",
    })));
    assert.equal(currentTheme.preference, "light");
    assert.equal(dom.window.document.documentElement.dataset.theme, "light");

    const storage = dom.window.localStorage;
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = () => { throw new Error("blocked"); };
    await act(async () => currentTheme.setPreference("dark"));
    assert.equal(currentTheme.preference, "dark");
    assert.equal(dom.window.document.documentElement.dataset.theme, "dark");
    storage.setItem = originalSetItem;
  } finally {
    await act(async () => reactRoot.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});

test("settings owns the accessible Select while public and admin headers stay unchanged", async () => {
  const [selector, headerActions, adminHeader, settings, settingsLoading] = await Promise.all([
    readSource("src/components/theme/ThemeSelector.tsx"),
    readSource("src/components/Header/HeaderActions.tsx"),
    readSource("src/components/(admin)/AdminHeader.tsx"),
    readSource("src/app/(authenticated)/settings/appearance/page.tsx"),
    readSource("src/app/(authenticated)/settings/appearance/loading.tsx"),
  ]);

  assert.match(selector, /<Field[\s\S]*label="顯示主題"/);
  assert.match(selector, /<Select/);
  assert.match(selector, /<option value="system">跟隨系統（預設）<\/option>/);
  assert.match(selector, /<option value="light">淺色<\/option>/);
  assert.match(selector, /<option value="dark">深色<\/option>/);
  assert.match(selector, /setPreference\(event\.target\.value\)/);
  assert.doesNotMatch(headerActions, /ThemeMenu|ThemeSelector|切換網站主題/);
  assert.doesNotMatch(adminHeader, /ThemeMenu|ThemeSelector|切換網站主題/);
  assert.match(settings, /title="外觀與偏好"/);
  assert.match(settings, /<ThemeSelector \/>/);
  assert.match(settingsLoading, /SettingsCardLoading/);
});

test("settings theme Select applies each validated preference immediately", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", {
    pretendToBeVisual: true,
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    Event: globalThis.Event,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Event = dom.window.Event;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const selected = [];
  const { ThemeSelector } = load("src/components/theme/ThemeSelector.tsx", {
    "@/contexts/ThemeContext": {
      useTheme: () => ({ preference: "system", resolvedTheme: "light", setPreference: (value) => selected.push(value) }),
    },
  });
  const reactRoot = createRoot(dom.window.document.getElementById("app"));

  try {
    await act(async () => reactRoot.render(createElement(ThemeSelector)));
    const select = dom.window.document.querySelector("select");
    assert.equal(select.getAttribute("aria-invalid"), null);
    assert.deepEqual([...select.options].map((option) => option.value), ["system", "light", "dark"]);
    select.value = "dark";
    await act(async () => select.dispatchEvent(new dom.window.Event("change", { bubbles: true })));
    assert.deepEqual(selected, ["dark"]);
  } finally {
    await act(async () => reactRoot.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});

test("dark theme overrides the complete semantic color surface", async () => {
  const styles = await readSource("src/styles/globals.css");
  const darkStart = styles.indexOf('html[data-theme="dark"]');
  const resetStart = styles.indexOf("Global Reset", darkStart);
  const dark = styles.slice(darkStart, resetStart);

  assert.ok(darkStart >= 0);
  for (const token of [
    "--text-primary", "--text-secondary", "--text-muted", "--text-inverse",
    "--surface-page", "--surface-default", "--surface-subtle", "--surface-elevated",
    "--border-default", "--border-muted", "--border-strong",
    "--interactive-primary", "--interactive-primary-hover", "--interactive-muted",
    "--action", "--action-hover", "--action-foreground",
    "--status-success", "--status-warning", "--status-danger", "--status-info",
    "--focus-ring", "--focus-ring-danger", "--overlay-backdrop",
    "--shadow-card", "--shadow-hover", "--skeleton-bg", "--skeleton-highlight",
  ]) {
    assert.ok(dark.includes(`${token}:`), `dark theme must define ${token}`);
  }
});

test("hero and destructive actions use dedicated semantic tokens", async () => {
  const [styles, hero, userMenu, button, feedback, badge] = await Promise.all([
    readSource("src/styles/globals.css"),
    readSource("src/components/(public)/home/HomeHeroPresentation.tsx"),
    readSource("src/components/Header/UserMenu.tsx"),
    readSource("src/components/ui/Button.tsx"),
    readSource("src/components/FormFeedback.tsx"),
    readSource("src/components/ui/Badge.tsx"),
  ]);

  assert.match(hero, /text-\(--text-on-image\)/);
  assert.match(hero, /text-\(--text-on-image-muted\)/);
  assert.match(hero, /hero-image-overlay/);
  assert.doesNotMatch(hero, /text-white|from-black|via-black|to-black/);
  assert.match(styles, /--destructive:/);
  assert.match(styles, /--destructive-hover:/);
  assert.match(styles, /--destructive-active:/);
  assert.match(styles, /--destructive-foreground:/);
  assert.match(styles, /\.btn\.danger\s*\{[\s\S]*?background: var\(--destructive\)/);
  assert.match(userMenu, /variant="danger"/);
  assert.doesNotMatch(userMenu, /text-\(--background\)|text-\(--text-inverse\)/);
  assert.match(button, /danger: "btn danger"/);
  assert.match(feedback, /text-\(--status-danger\)/);
  assert.match(badge, /danger: "var\(--status-danger\)"/);
});
