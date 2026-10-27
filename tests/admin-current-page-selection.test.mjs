import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { load } from "./helpers/load-app-module.mjs";

async function withDom(run) {
  const dom = new JSDOM('<div id="app"></div>', { url: "https://example.test" });
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
    await run({ host, root });
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
}

const click = (element) => act(async () => element.click());

test("current-page selection supports row, all, mixed, and data-scope pruning", async () => {
  const { useCurrentPageSelection } = load(
    "src/hooks/useCurrentPageSelection.ts",
  );

  function Harness({ itemIds }) {
    const selection = useCurrentPageSelection(itemIds);
    return createElement(
      "div",
      {
        "data-count": selection.selectedCount,
        "data-all": selection.allSelected,
        "data-partial": selection.partiallySelected,
      },
      createElement(
        "button",
        {
          type: "button",
          onClick: () => selection.setItemSelected("a", !selection.selectedIds.has("a")),
        },
        "toggle-a",
      ),
      createElement(
        "button",
        {
          type: "button",
          onClick: () => selection.setCurrentPageSelected(!selection.allSelected),
        },
        "toggle-all",
      ),
    );
  }

  await withDom(async ({ host, root }) => {
    await act(async () => root.render(createElement(Harness, { itemIds: ["a", "b"] })));
    const container = () => host.firstElementChild;
    const buttons = () => host.querySelectorAll("button");

    await click(buttons()[0]);
    assert.equal(container().dataset.count, "1");
    assert.equal(container().dataset.all, "false");
    assert.equal(container().dataset.partial, "true");

    await click(buttons()[1]);
    assert.equal(container().dataset.count, "2");
    assert.equal(container().dataset.all, "true");
    assert.equal(container().dataset.partial, "false");

    await click(buttons()[0]);
    assert.equal(container().dataset.count, "1");
    assert.equal(container().dataset.partial, "true");

    await act(async () => root.render(createElement(Harness, { itemIds: ["c"] })));
    assert.equal(container().dataset.count, "0");
    assert.equal(container().dataset.all, "false");
    assert.equal(container().dataset.partial, "false");

    await act(async () => root.render(createElement(Harness, { itemIds: ["a", "b"] })));
    assert.equal(container().dataset.count, "0");
    assert.equal(container().dataset.all, "false");
    assert.equal(container().dataset.partial, "false");

    await act(async () => root.render(createElement(Harness, { itemIds: ["a", "a"] })));
    await click(buttons()[1]);
    assert.equal(container().dataset.count, "1");
    assert.equal(container().dataset.all, "true");
    assert.equal(container().dataset.partial, "false");
  });
});

test("shared checkbox exposes an accessible name, indeterminate state, and enlarged target", async () => {
  const { AdminSelectionCheckbox } = load(
    "src/components/(admin)/admin/AdminSelectionCheckbox.tsx",
  );
  const source = await readFile(
    new URL("../src/components/(admin)/admin/AdminSelectionCheckbox.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /has-\[:focus-visible\]:outline-2/);
  assert.doesNotMatch(source, /focus-within:outline-2/);

  await withDom(async ({ host, root }) => {
    let checked = false;
    await act(async () =>
      root.render(
        createElement(AdminSelectionCheckbox, {
          checked,
          indeterminate: true,
          label: "選取測試紀錄",
          onCheckedChange: (next) => {
            checked = next;
          },
        }),
      ),
    );

    const input = host.querySelector('input[aria-label="選取測試紀錄"]');
    assert.equal(input.indeterminate, true);
    assert.match(input.parentElement.className, /min-h-8/);
    assert.match(input.parentElement.className, /min-w-8/);
    input.focus();
    assert.equal(domActiveElement(input), true);
    await click(input);
    assert.equal(checked, true);
  });
});

function domActiveElement(input) {
  return input.ownerDocument.activeElement === input;
}

test("all five bulk collections reset their client selection at query scope boundaries", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const [boardPage, membershipPage, keyPage, attendancePage, suggestionPage] =
    await Promise.all([
      read("src/app/(admin)/admin/board-games/page.tsx"),
      read("src/app/(admin)/admin/memberships/page.tsx"),
      read("src/app/(admin)/admin/memberships/register-keys/page.tsx"),
      read("src/app/(admin)/admin/events/[id]/attendances/page.tsx"),
      read("src/app/(admin)/admin/board-games/suggests/page.tsx"),
    ]);

  for (const source of [
    boardPage,
    membershipPage,
    keyPage,
    attendancePage,
    suggestionPage,
  ]) {
    assert.match(source, /key=\{JSON\.stringify\(/);
  }
});
