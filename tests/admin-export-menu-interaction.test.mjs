import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

async function withDom(run) {
  const dom = new JSDOM('<button id="outside">Outside</button><div id="app"></div>', {
    url: "https://example.test/admin/users",
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

test("export disclosure keeps native links and synchronizes its accessible state", async () => {
  const { AdminExportMenu } = load(
    "src/components/(admin)/admin/exports/AdminExportMenu.tsx",
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () =>
      root.render(
        createElement(AdminExportMenu, {
          domain: "users",
          query: {
            search: "王 小明",
            emailVerification: "verified",
            page: 3,
            pageSize: 20,
          },
        }),
      ),
    );

    const trigger = host.querySelector('button[aria-controls]');
    const panelId = trigger.getAttribute("aria-controls");
    assert.equal(trigger.textContent, "匯出");
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(trigger.hasAttribute("aria-haspopup"), false);
    assert.equal(dom.window.document.getElementById(panelId), null);

    await click(trigger);
    const panel = dom.window.document.getElementById(panelId);
    const links = [...panel.querySelectorAll("a")];
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.deepEqual(links.map((link) => link.textContent), [
      "CSV",
      "Excel (.xlsx)",
      "JSON",
    ]);
    assert.equal(panel.querySelector('[role="menu"]'), null);
    assert.equal(panel.querySelector('[role="menuitem"]'), null);
    assert.equal(
      links[0].getAttribute("href"),
      "/api/admin/exports/users?format=csv&search=%E7%8E%8B+%E5%B0%8F%E6%98%8E&emailVerification=verified",
    );
    assert.equal(links[0].getAttribute("target"), "_blank");

    links[0].addEventListener("click", (event) => event.preventDefault());
    await click(links[0]);
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.getElementById(panelId), null);
  });
});

test("Escape closes the export disclosure and returns focus to its trigger", async () => {
  const { AdminExportMenu } = load(
    "src/components/(admin)/admin/exports/AdminExportMenu.tsx",
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () =>
      root.render(createElement(AdminExportMenu, { domain: "memberships" })),
    );
    const trigger = host.querySelector('button[aria-controls]');
    await click(trigger);
    host.querySelector("a").focus();

    await act(async () =>
      dom.window.document.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );

    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.activeElement, trigger);
    assert.equal(host.querySelector("a"), null);
  });
});

test("outside pointer dismissal closes without stealing focus", async () => {
  const { AdminExportMenu } = load(
    "src/components/(admin)/admin/exports/AdminExportMenu.tsx",
  );

  await withDom(async ({ dom, host, root }) => {
    await act(async () =>
      root.render(createElement(AdminExportMenu, { domain: "borrowings" })),
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
    assert.equal(host.querySelector("a"), null);
  });
});

test("native keyboard activation toggles the disclosure without hidden focus targets", async () => {
  const { AdminExportMenu } = load(
    "src/components/(admin)/admin/exports/AdminExportMenu.tsx",
  );

  await withDom(async ({ host, root }) => {
    await act(async () =>
      root.render(createElement(AdminExportMenu, { domain: "board-games" })),
    );
    const trigger = host.querySelector('button[aria-controls]');
    trigger.focus();
    await click(trigger);
    assert.equal(host.querySelectorAll("a").length, 3);
    await click(trigger);
    assert.equal(host.querySelectorAll("a").length, 0);
  });
});
