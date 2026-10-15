import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

const gameId = "10000000-0000-4000-8000-000000000001";

async function withActions(run) {
  const dom = new JSDOM(
    '<button id="outside">Outside</button><div id="app"></div>',
    { url: `https://example.test/board-games/${gameId}` },
  );
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
  const { ReviewAuthorAction } = load(
    "src/components/(public)/board-games/ReviewAuthorAction.tsx",
    {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/components/Modal": { Modal: () => null },
      "@/components/ConfirmDialog": { ConfirmDialog: () => null },
    },
  );
  const host = dom.window.document.querySelector("#app");
  const root = createRoot(host);

  try {
    await act(async () =>
      root.render(
        createElement(ReviewAuthorAction, {
          boardGameId: gameId,
          eligibility: "verified",
          ownReview: { rating: 4, content: "值得再玩" },
        }),
      ),
    );
    await run({ dom, host });
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
}

const click = (element) => act(async () => element.click());

test("review actions use disclosure semantics and Escape restores trigger focus", async () => {
  await withActions(async ({ dom, host }) => {
    const trigger = host.querySelector('button[aria-label="評論操作"]');
    const panelId = trigger.getAttribute("aria-controls");
    assert.equal(trigger.type, "button");
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(trigger.hasAttribute("aria-haspopup"), false);

    await click(trigger);
    const panel = dom.window.document.getElementById(panelId);
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.equal(panel.querySelector('[role="menu"]'), null);
    assert.equal(panel.querySelector('[role="menuitem"]'), null);
    assert.deepEqual(
      [...panel.querySelectorAll("button")].map((button) => button.textContent),
      ["編輯評論", "刪除評論"],
    );

    panel.querySelector("button").focus();
    await act(async () =>
      dom.window.document.dispatchEvent(
        new dom.window.KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        }),
      ),
    );
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.activeElement, trigger);
    assert.equal(dom.window.document.getElementById(panelId), null);
  });
});

test("review action disclosure closes on outside pointer without stealing focus", async () => {
  await withActions(async ({ dom, host }) => {
    const trigger = host.querySelector('button[aria-label="評論操作"]');
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
    assert.equal(host.querySelector("button:nth-child(1)"), trigger);
  });
});

test("Tab focus leaving the review action disclosure closes its panel", async () => {
  await withActions(async ({ dom, host }) => {
    const trigger = host.querySelector('button[aria-label="評論操作"]');
    const panelId = trigger.getAttribute("aria-controls");
    await click(trigger);
    const buttons = dom.window.document
      .getElementById(panelId)
      .querySelectorAll("button");
    buttons[1].focus();

    const outside = dom.window.document.querySelector("#outside");
    await act(async () => outside.focus());

    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(dom.window.document.getElementById(panelId), null);
    assert.equal(dom.window.document.activeElement, outside);
  });
});
