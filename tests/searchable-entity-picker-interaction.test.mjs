import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { load } from "./helpers/load-app-module.mjs";

const items = [
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
  { id: "gamma", label: "Gamma" },
];

const baseProps = {
  search: async (query) => query === "empty" ? [] : items,
  getKey: (item) => item.id,
  renderResult: (item) => createElement("span", null, item.label),
  renderSelected: (item) => createElement("span", null, item.label),
  searchLabel: "搜尋項目",
  searchPlaceholder: "輸入關鍵字",
  resultsLabel: "搜尋結果",
  emptyMessage: "沒有結果",
  errorMessage: "搜尋失敗",
  clearSelectionLabel: (item) => `清除選擇：${item.label}`,
};

test("searchable entity picker implements an editable combobox interaction contract", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", { pretendToBeVisual: true });
  const previous = {
    window: globalThis.window, document: globalThis.document, Node: globalThis.Node,
    PointerEvent: globalThis.PointerEvent, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  globalThis.PointerEvent = dom.window.PointerEvent ?? dom.window.MouseEvent;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLElement.prototype.attachEvent = () => {};
  dom.window.HTMLElement.prototype.detachEvent = () => {};

  const { SearchableEntityPicker } = load("src/components/(admin)/admin/SearchableEntityPicker.tsx", {
    "next/navigation": { useRouter: () => ({ replace() {} }) },
  });
  const changes = [];
  const root = createRoot(dom.window.document.getElementById("app"));
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
  const fill = async (input, value) => act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new dom.window.InputEvent("input", { bubbles: true, data: value }));
  });
  const press = async (target, key) => act(async () => {
    target.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  try {
    await act(async () => root.render(createElement("form", null,
      createElement(SearchableEntityPicker, { ...baseProps, name: "entity", onChange: (item) => changes.push(item?.id ?? null) }),
      createElement(SearchableEntityPicker, { ...baseProps, disabled: true }),
      createElement("button", { type: "button", id: "outside" }, "Outside"),
    )));
    const inputs = [...dom.window.document.querySelectorAll('[role="combobox"]')];
    const input = inputs[0];
    const outside = dom.window.document.getElementById("outside");
    assert.equal(new Set(inputs.map((item) => item.getAttribute("aria-controls"))).size, 2);
    assert.equal(inputs[1].disabled, true);
    assert.equal(input.getAttribute("aria-expanded"), "false");
    assert.equal(input.getAttribute("aria-autocomplete"), "list");
    assert.equal(input.hasAttribute("aria-activedescendant"), false);

    input.focus();
    await fill(input, "a");
    await press(input, "Enter");
    let listbox = dom.window.document.querySelector('[role="listbox"]');
    assert.ok(listbox);
    assert.equal(input.getAttribute("aria-expanded"), "true");
    assert.equal(input.getAttribute("aria-controls"), listbox.parentElement.id);
    assert.equal(input.getAttribute("aria-activedescendant"), listbox.querySelector('[role="option"]').id);
    assert.equal(dom.window.document.activeElement, input);
    assert.ok([...listbox.querySelectorAll('[role="option"]')].every((option) => option.tabIndex === -1));

    await press(input, "Escape");
    assert.equal(dom.window.document.querySelector('[role="listbox"]'), null);
    assert.equal(input.hasAttribute("aria-activedescendant"), false);
    assert.equal(dom.window.document.activeElement, input);

    await press(input, "Enter");
    await act(async () => outside.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true })));
    assert.equal(dom.window.document.querySelector('[role="listbox"]'), null);
    assert.equal(dom.window.document.activeElement, input);

    await press(input, "Enter");
    await press(input, "ArrowDown");
    assert.match(input.getAttribute("aria-activedescendant"), /option-1$/);
    await press(input, "ArrowDown");
    await press(input, "ArrowDown");
    assert.match(input.getAttribute("aria-activedescendant"), /option-2$/);
    await press(input, "ArrowUp");
    assert.match(input.getAttribute("aria-activedescendant"), /option-1$/);
    await press(input, "Enter");
    assert.deepEqual(changes, ["beta"]);
    assert.equal(dom.window.document.querySelector('[role="listbox"]'), null);
    assert.equal(new dom.window.FormData(dom.window.document.querySelector("form")).get("entity"), "beta");

    const clear = dom.window.document.querySelector('[aria-label="清除選擇：Beta"]');
    await act(async () => clear.click());
    assert.deepEqual(changes, ["beta", null]);
    const nextInput = dom.window.document.querySelector('[role="combobox"]:not(:disabled)');
    await fill(nextInput, "empty");
    await press(nextInput, "Enter");
    const popup = dom.window.document.getElementById(nextInput.getAttribute("aria-controls"));
    assert.ok(popup);
    assert.equal(nextInput.hasAttribute("aria-activedescendant"), false);
    assert.equal(popup.querySelector('[role="status"]').textContent, "沒有結果");

    await act(async () => {
      outside.focus();
      nextInput.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true, relatedTarget: outside }));
    });
    assert.equal(dom.window.document.querySelector('[role="listbox"]'), null);
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});
