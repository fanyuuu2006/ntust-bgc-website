import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

async function withDom(run) {
  const dom = new JSDOM('<button id="outside">Outside</button><div id="app"></div>', {
    url: "https://example.test/board-games?search=strategy&status=available&sort=popular",
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    Node: globalThis.Node,
    HTMLElement: globalThis.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    Node: dom.window.Node,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const host = dom.window.document.querySelector("#app");
  const root = createRoot(host);

  try {
    await run({ dom, host, root });
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
}

const props = {
  statusOptions: [{ value: "available", label: "Available" }],
  categoryOptions: [{ value: "strategy", label: "Strategy" }],
  locationOptions: [{ value: "club-room", label: "Club room" }],
  selectedStatuses: ["available"],
  selectedCategories: ["strategy"],
  selectedLocations: undefined,
  appliedQuery: {
    search: "strategy",
    status: ["available"],
    category: ["strategy"],
    sort: "popular",
    pageSize: 24,
  },
  clearFiltersHref: "/board-games?search=strategy&sort=popular&page=1&pageSize=24",
  activeFilterCount: 2,
};

test("public Board Game filters expose controlled disclosure state and preserve drafts", async () => {
  const { BoardGameFilterDisclosure } = load(
    "src/components/(public)/board-games/BoardGameFilterDisclosure.tsx",
    { "next/navigation": { useRouter: () => ({ push() {} }) } },
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () => root.render(createElement(BoardGameFilterDisclosure, props)));
    const trigger = host.querySelector('button[aria-controls]');
    const panel = dom.window.document.getElementById(trigger.getAttribute("aria-controls"));
    const checkboxes = panel.querySelectorAll('input[type="checkbox"]');

    assert.equal(trigger.tagName, "BUTTON");
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(panel.hidden, true);
    assert.equal(checkboxes[0].checked, true);
    assert.equal(checkboxes[1].checked, true);

    await act(async () => trigger.click());
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.equal(panel.hidden, false);

    checkboxes[2].checked = true;
    await act(async () => trigger.click());
    assert.equal(panel.hidden, true);
    await act(async () => trigger.click());
    assert.equal(checkboxes[2].checked, true);

    checkboxes[2].focus();
    await act(async () => dom.window.document.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    ));
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(panel.hidden, true);
    assert.equal(dom.window.document.activeElement, trigger);
  });
});

test("outside pointer closes public filters without stealing focus", async () => {
  const { BoardGameFilterDisclosure } = load(
    "src/components/(public)/board-games/BoardGameFilterDisclosure.tsx",
    { "next/navigation": { useRouter: () => ({ push() {} }) } },
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () => root.render(createElement(BoardGameFilterDisclosure, props)));
    const trigger = host.querySelector('button[aria-controls]');
    await act(async () => trigger.click());

    const outside = dom.window.document.querySelector("#outside");
    outside.focus();
    await act(async () => outside.dispatchEvent(
      new dom.window.MouseEvent("pointerdown", { bubbles: true }),
    ));

    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.activeElement, outside);
    assert.equal(dom.window.document.getElementById(trigger.getAttribute("aria-controls")).hidden, true);
  });
});
