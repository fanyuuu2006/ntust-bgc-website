import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

async function withDom(run) {
  const dom = new JSDOM('<button id="outside">Outside</button><div id="app"></div>', {
    url: "https://example.test/admin/board-games",
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
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

const click = (element) => act(async () => element.click());

test("filter disclosure exposes state and returns focus after Escape", async () => {
  const { QueryFilterDisclosure } = load(
    "src/components/query/QueryFilterDisclosure.tsx",
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () =>
      root.render(
        createElement(
          QueryFilterDisclosure,
          { label: "篩選" },
          createElement("button", { type: "button" }, "套用篩選"),
        ),
      ),
    );

    const trigger = host.querySelector('button[aria-controls]');
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(
      dom.window.document.getElementById(trigger.getAttribute("aria-controls")),
      null,
    );

    await click(trigger);
    const panelId = trigger.getAttribute("aria-controls");
    const panel = dom.window.document.getElementById(panelId);
    const panelButton = panel.querySelector("button");
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.ok(panel);

    panelButton.focus();
    await act(async () =>
      dom.window.document.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.getElementById(panelId), null);
    assert.equal(dom.window.document.activeElement, trigger);
  });
});

test("outside pointer dismissal closes without taking focus", async () => {
  const { QueryFilterDisclosure } = load(
    "src/components/query/QueryFilterDisclosure.tsx",
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () =>
      root.render(
        createElement(
          QueryFilterDisclosure,
          { label: "篩選" },
          createElement("button", { type: "button" }, "套用"),
        ),
      ),
    );

    const trigger = host.querySelector('button[aria-controls]');
    await click(trigger);

    const outside = dom.window.document.querySelector("#outside");
    outside.focus();
    await act(async () =>
      outside.dispatchEvent(
        new dom.window.MouseEvent("pointerdown", { bubbles: true }),
      ),
    );

    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.activeElement, outside);
  });
});
