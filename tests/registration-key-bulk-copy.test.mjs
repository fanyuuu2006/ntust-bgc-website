import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { load } from "./helpers/load-app-module.mjs";

const registerKeys = [
  {
    id: "key-1",
    register_key: "KEY-ALPHA",
    sequence_number: 1,
    status: "available",
    created_at: "2026-10-01T00:00:00.000Z",
    claimed_at: null,
    academic_year: { year: 115 },
  },
  {
    id: "key-2",
    register_key: "KEY-ALPHA",
    sequence_number: 2,
    status: "available",
    created_at: "2026-10-02T00:00:00.000Z",
    claimed_at: null,
    academic_year: { year: 115 },
  },
  {
    id: "key-3",
    register_key: "KEY-BETA",
    sequence_number: 3,
    status: "claimed",
    created_at: "2026-10-03T00:00:00.000Z",
    claimed_at: "2026-10-04T00:00:00.000Z",
    academic_year: { year: 115 },
  },
];

async function withTable(
  run,
  {
    copyFails = false,
    mutationStatus = 200,
    mutationBody = { data: { revokedCount: 2 } },
  } = {},
) {
  const dom = new JSDOM('<div id="app"></div>', { url: "https://example.test" });
  const writes = [];
  const requests = [];
  const refreshes = [];
  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value) => {
        if (copyFails) throw new Error("clipboard unavailable");
        writes.push(value);
      },
    },
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
    fetch: globalThis.fetch,
  };
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify(mutationBody), {
      status: mutationStatus,
      headers: { "Content-Type": "application/json" },
    });
  };
  const { createRoot } = await import("react-dom/client");
  const host = document.getElementById("app");
  const root = createRoot(host);
  const { RegisterKeyTable } = load(
    "src/components/(admin)/admin/memberships/RegisterKeyTable.tsx",
    {
      "next/navigation": {
        useRouter: () => ({ refresh: () => refreshes.push(true) }),
      },
      "@/components/ConfirmDialog": {
        ConfirmDialog: ({ open, onConfirm, title, description }) =>
          open
            ? createElement(
                "section",
                { "aria-label": title },
                createElement("p", null, description),
                createElement(
                  "button",
                  { type: "button", onClick: onConfirm },
                  "確認",
                ),
              )
            : null,
      },
    },
  );

  try {
    await run({
      dom,
      host,
      root,
      writes,
      requests,
      refreshes,
      RegisterKeyTable,
    });
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", navigatorDescriptor);
    } else {
      delete globalThis.navigator;
    }
    dom.window.close();
  }
}

const click = (element) => act(async () => element.click());

test("current-page selection exposes mixed state and copies unique keys in visible order", async () => {
  await withTable(async ({ host, root, writes, RegisterKeyTable }) => {
    await act(async () =>
      root.render(createElement(RegisterKeyTable, { registerKeys })),
    );

    const findSelectAll = () => host.querySelector(
      'input[aria-label="選取目前頁面的所有社員註冊序號"]',
    );

    assert.doesNotMatch(host.textContent, /已選取 0 筆/);
    assert.equal(
      [...host.querySelectorAll("button")].some(
        (button) => button.textContent === "複製已選序號",
      ),
      false,
    );

    const alphaCheckboxes = host.querySelectorAll(
      'input[aria-label="選取社員註冊序號 KEY-ALPHA"]',
    );
    await click(alphaCheckboxes[0]);
    assert.equal(findSelectAll().indeterminate, true);
    assert.match(host.textContent, /已選取 1 筆/);
    const copyButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "複製已選序號",
    );
    const clearButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "清除選取",
    );

    await click(findSelectAll());
    assert.equal(findSelectAll().checked, true);
    assert.equal(findSelectAll().indeterminate, false);
    assert.match(host.textContent, /已選取 3 筆/);

    await click(copyButton);
    assert.deepEqual(writes, ["KEY-ALPHA\nKEY-BETA"]);
    assert.match(host.textContent, /已複製 2 組社員註冊序號/);

    await click(clearButton);
    assert.doesNotMatch(host.textContent, /已選取 0 筆/);
    assert.equal(host.contains(copyButton), false);
  });
});

test("selection is shared by desktop and mobile controls and resets with collection scope", async () => {
  await withTable(async ({ host, root, RegisterKeyTable }) => {
    await act(async () =>
      root.render(
        createElement(RegisterKeyTable, {
          key: "page=1&status=available",
          registerKeys,
        }),
      ),
    );

    const enterBulkMode = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "選取",
    );
    await click(enterBulkMode);
    const betaCheckboxes = host.querySelectorAll(
      'input[aria-label="選取社員註冊序號 KEY-BETA"]',
    );
    assert.equal(betaCheckboxes.length, 2);
    await click(betaCheckboxes[0]);
    assert.equal(betaCheckboxes[0].checked, true);
    assert.equal(betaCheckboxes[1].checked, true);

    await act(async () =>
      root.render(
        createElement(RegisterKeyTable, {
          key: "page=2&status=available",
          registerKeys,
        }),
      ),
    );
    assert.doesNotMatch(host.textContent, /已選取 0 筆/);
    assert.equal(
      [...host.querySelectorAll("button")].some(
        (button) => button.textContent === "複製已選序號",
      ),
      false,
    );
  });
});

test("clipboard failure keeps the selection and reports a recoverable error", async () => {
  await withTable(async ({ host, root, writes, RegisterKeyTable }) => {
    await act(async () =>
      root.render(createElement(RegisterKeyTable, { registerKeys })),
    );

    await click(
      host.querySelector(
        'input[aria-label="選取社員註冊序號 KEY-BETA"]',
      ),
    );
    const copyButton = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "複製已選序號",
    );
    await click(copyButton);

    assert.deepEqual(writes, []);
    assert.match(host.textContent, /無法複製已選取的社員註冊序號/);
    assert.match(host.textContent, /已選取 1 筆/);
  }, { copyFails: true });
});

test("bulk revoke accepts only an all-available selection and preserves visible order", async () => {
  await withTable(
    async ({ host, root, requests, refreshes, RegisterKeyTable }) => {
      await act(async () =>
        root.render(createElement(RegisterKeyTable, { registerKeys })),
      );

      const alphaCheckboxes = host.querySelectorAll(
        'input[aria-label="選取社員註冊序號 KEY-ALPHA"]',
      );
      await click(alphaCheckboxes[0]);
      await click(alphaCheckboxes[1]);
      const bulkButton = [...host.querySelectorAll("button")].find(
        (button) => button.textContent === "批次撤銷",
      );
      assert.equal(bulkButton.disabled, false);

      await click(bulkButton);
      const dialog = host.querySelector(
        'section[aria-label="批次撤銷社員註冊序號"]',
      );
      assert.match(dialog.textContent, /已選取的 2 組/);
      assert.match(dialog.textContent, /撤銷後無法再用於建立社員資格/);
      await click(dialog.querySelector("button"));

      assert.equal(requests.length, 1);
      assert.equal(requests[0].url, "/api/admin/members/register-keys/batch");
      assert.equal(requests[0].options.method, "PATCH");
      assert.deepEqual(JSON.parse(requests[0].options.body), {
        action: "revoke",
        ids: ["key-1", "key-2"],
      });
      assert.match(host.textContent, /已撤銷 2 組社員註冊序號/);
      assert.doesNotMatch(host.textContent, /已選取 0 筆/);
      assert.equal(refreshes.length, 1);
    },
  );
});

test("bulk revoke rejects mixed-state selection and retains selection after conflict", async () => {
  await withTable(
    async ({ host, root, RegisterKeyTable }) => {
      await act(async () =>
        root.render(createElement(RegisterKeyTable, { registerKeys })),
      );
      await click(
        host.querySelector(
          'input[aria-label="選取目前頁面的所有社員註冊序號"]',
        ),
      );
      const bulkButton = [...host.querySelectorAll("button")].find(
        (button) => button.textContent === "批次撤銷",
      );
      assert.equal(bulkButton.disabled, true);
      assert.match(host.textContent, /已選取 3 筆，其中 2 筆可撤銷/);
    },
  );

  await withTable(
    async ({ host, root, requests, refreshes, RegisterKeyTable }) => {
      await act(async () =>
        root.render(createElement(RegisterKeyTable, { registerKeys })),
      );
      const alphaCheckboxes = host.querySelectorAll(
        'input[aria-label="選取社員註冊序號 KEY-ALPHA"]',
      );
      await click(alphaCheckboxes[0]);
      await click(alphaCheckboxes[1]);
      const bulkButton = [...host.querySelectorAll("button")].find(
        (button) => button.textContent === "批次撤銷",
      );
      await click(bulkButton);
      await click(
        host.querySelector(
          'section[aria-label="批次撤銷社員註冊序號"] button',
        ),
      );

      assert.equal(requests.length, 1);
      assert.equal(refreshes.length, 0);
      assert.match(host.textContent, /序號狀態已變更/);
      assert.match(host.textContent, /已選取 2 筆/);
    },
    {
      mutationStatus: 409,
      mutationBody: { message: "序號狀態已變更，未撤銷任何序號" },
    },
  );
});

test("register-key page keys the collection by normalized query state", async () => {
  const { readFile } = await import("node:fs/promises");
  const page = await readFile(
    new URL(
      "../src/app/(admin)/admin/memberships/register-keys/page.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(page, /key=\{JSON\.stringify\(\{ \.\.\.query, page, pageSize \}\)\}/);
});

test("registration-key bulk controls use wrapping inline actions on mobile", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL(
      "../src/components/(admin)/admin/memberships/RegisterKeyTable.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /mobilePresentation="inline"/);
  assert.match(source, /min-w-fit flex-1 lg:flex-none/);
  assert.doesNotMatch(source, /mobilePresentation="panel"/);
});
