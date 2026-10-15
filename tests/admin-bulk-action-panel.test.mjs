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

function renderPanel(AdminBulkActionBar, props = {}) {
  return createElement(
    AdminBulkActionBar,
    {
      selectedCount: 2,
      onClear: () => {},
      mobilePresentation: "panel",
      desktopBreakpoint: "xl",
      ...props,
    },
    createElement("button", { type: "button" }, "套用變更"),
  );
}

test("mobile bulk action panel exposes controlled disclosure semantics", async () => {
  const { AdminBulkActionBar } = load(
    "src/components/(admin)/admin/AdminBulkActionBar.tsx",
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () => root.render(renderPanel(AdminBulkActionBar)));

    const trigger = host.querySelector('button[aria-controls]');
    const panelId = trigger.getAttribute("aria-controls");
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.getElementById(panelId), null);

    await click(trigger);
    const panel = dom.window.document.getElementById(panelId);
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.equal(panel.textContent, "套用變更");

    panel.querySelector("button").focus();
    await act(async () =>
      dom.window.document.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.activeElement, trigger);
  });
});

test("outside pointer closes the mobile panel without stealing focus", async () => {
  const { AdminBulkActionBar } = load(
    "src/components/(admin)/admin/AdminBulkActionBar.tsx",
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () => root.render(renderPanel(AdminBulkActionBar)));
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

test("removing the selected action surface resets panel state on remount", async () => {
  const { AdminBulkActionBar } = load(
    "src/components/(admin)/admin/AdminBulkActionBar.tsx",
  );

  await withDom(async ({ host, root }) => {
    await act(async () => root.render(renderPanel(AdminBulkActionBar)));
    await click(host.querySelector('button[aria-controls]'));

    await act(async () => root.render(null));
    assert.equal(host.firstElementChild, null);

    await act(async () => root.render(renderPanel(AdminBulkActionBar)));
    assert.equal(
      host.querySelector('button[aria-controls]').getAttribute("aria-expanded"),
      "false",
    );
  });
});

test("inline mobile actions remain directly available without disclosure or scrolling", async () => {
  const { AdminBulkActionBar } = load(
    "src/components/(admin)/admin/AdminBulkActionBar.tsx",
  );

  await withDom(async ({ host, root }) => {
    await act(async () =>
      root.render(
        createElement(
          AdminBulkActionBar,
          {
            selectedCount: 2,
            onClear: () => {},
            mobilePresentation: "inline",
          },
          createElement("button", { type: "button" }, "複製已選序號"),
        ),
      ),
    );

    assert.equal(host.querySelector('button[aria-controls]'), null);
    assert.match(host.textContent, /複製已選序號/);
    assert.doesNotMatch(host.innerHTML, /overflow-x-auto|flex-nowrap/);
  });
});

test("a panel opened before loading can still close and return focus", async () => {
  const { AdminBulkActionBar } = load(
    "src/components/(admin)/admin/AdminBulkActionBar.tsx",
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () => root.render(renderPanel(AdminBulkActionBar)));
    const trigger = host.querySelector('button[aria-controls]');
    await click(trigger);

    await act(async () =>
      root.render(renderPanel(AdminBulkActionBar, { disabled: true })),
    );
    assert.equal(trigger.disabled, false);

    await act(async () =>
      dom.window.document.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.activeElement, trigger);
    assert.equal(trigger.disabled, true);
  });
});
