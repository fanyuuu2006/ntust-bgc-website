import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

test("user menu and mobile navigation keep disclosure, route, focus and dismissal contracts", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", {
    pretendToBeVisual: true,
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    Node: globalThis.Node,
    PointerEvent: globalThis.PointerEvent,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.PointerEvent = dom.window.PointerEvent ?? dom.window.MouseEvent;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  let pathname = "/board-games";
  let mediaListener;
  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener: (_type, listener) => { mediaListener = listener; },
    removeEventListener: () => {},
  });
  const Link = ({ href, children, ...props }) => createElement("a", { href, ...props }, children);
  const navigationMock = { usePathname: () => pathname };
  const sharedMocks = {
    "next/link": { __esModule: true, default: Link },
    "next/navigation": navigationMock,
  };
  const { UserMenu } = load("src/components/Header/UserMenu.tsx", {
    ...sharedMocks,
    "@/components/Header/UserAvatar": undefined,
    "../UserAvatar": { UserAvatar: ({ user }) => createElement("span", null, user.name) },
    "../LogoutButton": {
      LogoutButton: ({ onClick, children, ...props }) => createElement("button", { type: "button", onClick, ...props }, children),
    },
  });
  const { MobileNavigation } = load("src/components/Header/MobileNavigation.tsx", sharedMocks);
  const user = { id: "user-1", name: "Test User", email: "user@example.test", avatar: null };
  const items = [{ label: "首頁", href: "/" }, { label: "桌遊", href: "/board-games" }];
  const root = createRoot(dom.window.document.getElementById("app"));
  const render = async () => act(async () => root.render(createElement("div", null,
    createElement(MobileNavigation, { items }),
    createElement(UserMenu, { user, isAdmin: true }),
    createElement("button", { type: "button", id: "outside" }, "Outside"),
  )));
  const buttons = () => [...dom.window.document.querySelectorAll("button")];
  const mobileTrigger = () => buttons().find((button) => button.getAttribute("aria-label")?.includes("導覽"));
  const userTrigger = () => buttons().find((button) => button.getAttribute("aria-label")?.includes("Test User"));

  try {
    await render();
    assert.equal(mobileTrigger().getAttribute("aria-expanded"), "false");
    assert.equal(userTrigger().getAttribute("aria-expanded"), "false");

    await act(async () => mobileTrigger().focus());
    await act(async () => mobileTrigger().click());
    assert.equal(mobileTrigger().getAttribute("aria-expanded"), "true");
    assert.ok(dom.window.document.getElementById(mobileTrigger().getAttribute("aria-controls")));
    assert.equal(dom.window.document.querySelector('a[aria-current="page"]').getAttribute("href"), "/board-games");

    await act(async () => {
      mobileTrigger().dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    assert.equal(mobileTrigger().getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.activeElement, mobileTrigger());

    await act(async () => mobileTrigger().click());
    await act(async () => userTrigger().focus());
    await act(async () => userTrigger().click());
    assert.equal(mobileTrigger().getAttribute("aria-expanded"), "false");
    assert.equal(userTrigger().getAttribute("aria-expanded"), "true");

    const profileLink = dom.window.document.querySelector('a[href="/profile"]');
    await act(async () => profileLink.click());
    assert.equal(userTrigger().getAttribute("aria-expanded"), "false");

    await act(async () => userTrigger().click());
    const outside = dom.window.document.getElementById("outside");
    await act(async () => outside.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true })));
    assert.equal(userTrigger().getAttribute("aria-expanded"), "false");

    await act(async () => userTrigger().click());
    await act(async () => outside.focus());
    assert.equal(userTrigger().getAttribute("aria-expanded"), "false");

    await act(async () => mobileTrigger().click());
    pathname = "/announcements";
    await render();
    assert.equal(mobileTrigger().getAttribute("aria-expanded"), "false");

    await act(async () => userTrigger().click());
    pathname = "/settings";
    await render();
    assert.equal(userTrigger().getAttribute("aria-expanded"), "false");

    pathname = "/board-games";
    await render();
    await act(async () => mobileTrigger().click());
    await act(async () => mediaListener({ matches: true }));
    assert.equal(mobileTrigger().getAttribute("aria-expanded"), "false");

    await act(async () => userTrigger().click());
    const logout = buttons().find((button) => button.textContent.includes("登出"));
    assert.ok(logout);
    await act(async () => logout.click());
    assert.equal(userTrigger().getAttribute("aria-expanded"), "false");
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});
