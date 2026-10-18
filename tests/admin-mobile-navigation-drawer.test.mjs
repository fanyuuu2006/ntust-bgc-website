import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function withDom(run) {
  const dom = new JSDOM("<!doctype html><html><body style='overflow: auto'><div id='app'></div></body></html>", { pretendToBeVisual: true });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    KeyboardEvent: globalThis.KeyboardEvent,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    KeyboardEvent: dom.window.KeyboardEvent,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(dom.window.document.getElementById("app"));

  try {
    await run({ dom, root });
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
}

test("modal drawer hook traps focus, handles Escape, and restores scroll state", async () => {
  const { useModalDrawer } = load("src/hooks/useModalDrawer.ts");

  function Harness({ onClosed }) {
    const [isOpen, setIsOpen] = useState(true);
    const onClose = useCallback((restoreFocus) => {
      onClosed(restoreFocus);
      setIsOpen(false);
    }, [onClosed]);
    const { drawerRef, initialFocusRef } = useModalDrawer({ isOpen, onClose });

    return isOpen ? createElement(
      "aside",
      { ref: drawerRef, role: "dialog", "aria-modal": "true" },
      createElement("button", { ref: initialFocusRef, type: "button" }, "Close"),
      createElement("button", { type: "button", disabled: true }, "Disabled"),
      createElement("a", { href: "/admin" }, "First link"),
      createElement("button", { type: "button" }, "Last action"),
    ) : createElement("p", null, "Closed");
  }

  await withDom(async ({ dom, root }) => {
    const closeCalls = [];
    await act(async () => root.render(createElement(Harness, { onClosed: (restoreFocus) => closeCalls.push(restoreFocus) })));

    const buttons = dom.window.document.querySelectorAll("button");
    const closeButton = buttons[0];
    const disabledButton = buttons[1];
    const lastButton = buttons[2];
    assert.equal(dom.window.document.activeElement, closeButton);
    assert.equal(dom.window.document.body.style.overflow, "hidden");

    lastButton.focus();
    const forwardTab = new dom.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    dom.window.document.dispatchEvent(forwardTab);
    assert.equal(forwardTab.defaultPrevented, true);
    assert.equal(dom.window.document.activeElement, closeButton);

    closeButton.focus();
    const backwardTab = new dom.window.KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true });
    dom.window.document.dispatchEvent(backwardTab);
    assert.equal(backwardTab.defaultPrevented, true);
    assert.equal(dom.window.document.activeElement, lastButton);
    assert.notEqual(dom.window.document.activeElement, disabledButton);

    await act(async () => {
      dom.window.document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    assert.deepEqual(closeCalls, [true]);
    assert.equal(dom.window.document.querySelector('[role="dialog"]'), null);
    assert.equal(dom.window.document.body.style.overflow, "auto");

    const afterCloseTab = new dom.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    dom.window.document.dispatchEvent(afterCloseTab);
    assert.equal(afterCloseTab.defaultPrevented, false);
  });
});

test("modal drawer hook removes listeners and restores scroll state on unmount", async () => {
  const { useModalDrawer } = load("src/hooks/useModalDrawer.ts");
  let closeCount = 0;

  function Harness() {
    const onClose = useCallback(() => { closeCount += 1; }, []);
    const { drawerRef, initialFocusRef } = useModalDrawer({ isOpen: true, onClose });
    return createElement("aside", { ref: drawerRef }, createElement("button", { ref: initialFocusRef, type: "button" }, "Close"));
  }

  await withDom(async ({ dom, root }) => {
    await act(async () => root.render(createElement(Harness)));
    assert.equal(dom.window.document.body.style.overflow, "hidden");
    await act(async () => root.render(null));
    assert.equal(dom.window.document.body.style.overflow, "auto");

    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert.equal(closeCount, 0);
  });
});

test("Admin mobile sidebar wires modal dismissal and desktop compatibility", async () => {
  const sidebar = await readSource("src/components/(admin)/AdminSidebar.tsx");
  assert.match(sidebar, /useModalDrawer\(\{ isOpen, onClose \}\)/);
  assert.match(sidebar, /role=\{isOpen \? "dialog" : undefined\}/);
  assert.match(sidebar, /aria-modal=\{isOpen \? "true" : undefined\}/);
  assert.match(sidebar, /onPointerDown=\{\(\) => onClose\(true\)\}/);
  assert.match(sidebar, /AdminSidebarNav onNavigate=\{\(\) => onClose\(false\)\}/);
  assert.match(sidebar, /matchMedia\("\(min-width: 1024px\)"\)/);
  assert.match(sidebar, /if \(event\.matches\) onClose\(false\)/);
  assert.match(sidebar, /isOpen \? "visible translate-x-0" : "invisible -translate-x-full"/);
  assert.match(sidebar, /lg:visible/);
  assert.match(sidebar, /lg:sticky/);
  assert.match(sidebar, /max-w-\[calc\(100vw-2rem\)\]/);
  assert.match(sidebar, /overflow-y-auto overscroll-contain/);
});

test("AdminShell owns background inertness and reason-aware focus return", async () => {
  const [shell, header] = await Promise.all([
    readSource("src/components/layouts/AdminShell.tsx"),
    readSource("src/components/(admin)/AdminHeader.tsx"),
  ]);
  assert.match(shell, /inert=\{isSidebarOpen \? true : undefined\}/);
  assert.match(shell, /closeSidebar = useCallback\(\(restoreFocus = true\)/);
  assert.match(shell, /sidebarState\.pathname !== pathname[\s\S]*isOpen: false/);
  assert.match(shell, /if \(restoreFocus\)[\s\S]*menuButtonRef\.current\?\.focus/);
  assert.match(shell, /<AdminSidebar[\s\S]*onClose=\{closeSidebar\}/);
  assert.match(header, /aria-expanded=\{isSidebarOpen\}/);
  assert.match(header, /aria-controls=\{sidebarId\}/);
});

test("AdminShell applies inertness and restores focus only for dismissals", async () => {
  let pathname = "/admin";
  const AdminHeader = ({ inert, menuButtonRef, onOpenMenu }) => createElement(
    "header",
    { inert, "data-testid": "header" },
    createElement("button", { ref: menuButtonRef, type: "button", onClick: onOpenMenu }, "Open"),
  );
  const AdminSidebar = ({ isOpen, onClose }) => createElement(
    "aside",
    { "data-open": String(isOpen) },
    createElement("button", { type: "button", onClick: () => onClose(true) }, "Dismiss"),
    createElement("button", { type: "button", onClick: () => onClose(false) }, "Navigate"),
  );
  const { AdminShell } = load("src/components/layouts/AdminShell.tsx", {
    "next/navigation": { usePathname: () => pathname },
    "../(admin)/AdminHeader": { AdminHeader },
    "../(admin)/AdminSidebar": { AdminSidebar },
    "@/libs/navigation": { adminSidebarNavigation: [] },
    "@/utils/navigation": { getActiveNavigationHref: () => undefined },
  });

  await withDom(async ({ dom, root }) => {
    const previousAnimationFrame = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (callback) => { callback(0); return 1; };
    const render = () => act(async () => root.render(createElement(
      AdminShell,
      { user: { id: "admin" } },
      createElement("button", { type: "button", id: "content-action" }, "Content"),
    )));

    try {
      await render();
      const button = (label) => [...dom.window.document.querySelectorAll("button")].find((item) => item.textContent === label);
      const header = dom.window.document.querySelector('[data-testid="header"]');
      const main = dom.window.document.querySelector("main");

      await act(async () => button("Open").click());
      assert.equal(header.hasAttribute("inert"), true);
      assert.equal(main.hasAttribute("inert"), true);

      await act(async () => button("Dismiss").click());
      assert.equal(header.hasAttribute("inert"), false);
      assert.equal(main.hasAttribute("inert"), false);
      assert.equal(dom.window.document.activeElement, button("Open"));

      await act(async () => button("Open").click());
      button("Navigate").focus();
      await act(async () => button("Navigate").click());
      assert.notEqual(dom.window.document.activeElement, button("Open"));

      await act(async () => button("Open").click());
      pathname = "/admin/users";
      await render();
      assert.equal(dom.window.document.querySelector("aside").dataset.open, "false");
      assert.equal(header.hasAttribute("inert"), false);
      assert.equal(main.hasAttribute("inert"), false);
      assert.notEqual(dom.window.document.activeElement, button("Open"));
    } finally {
      globalThis.requestAnimationFrame = previousAnimationFrame;
    }
  });
});
