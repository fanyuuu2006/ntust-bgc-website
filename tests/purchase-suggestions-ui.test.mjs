import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { load } from "./helpers/load-app-module.mjs";

async function withDom(run) {
  const dom = new JSDOM('<div id="app"></div>', { url: "https://example.test" });
  // jsdom has no native dialog top layer; model open/close for component tests.
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const previous = { window: globalThis.window, document: globalThis.document, FormData: globalThis.FormData, HTMLElement: globalThis.HTMLElement, requestAnimationFrame: globalThis.requestAnimationFrame, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, FormData: dom.window.FormData, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  const { createRoot } = await import("react-dom/client");
  const host = document.getElementById("app");
  const root = createRoot(host);
  try { await run({ dom, host, root }); }
  finally { await act(async () => root.unmount()); Object.assign(globalThis, previous); dom.window.close(); }
}

test("rules button opens the shared dialog without submitting or clearing the form", async () => {
  await withDom(async ({ dom, host, root }) => {
    let calls = 0;
    const { PurchaseSuggestionForm } = load("src/components/(authenticated)/purchase-suggestions/PurchaseSuggestionForm.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/libs/api/client": { apiClient: async () => { calls++; } },
    });
    await act(async () => root.render(createElement(PurchaseSuggestionForm, { remaining: 3 })));
    const input = host.querySelector('[name="game_name"]');
    input.value = "保留中的桌遊";
    const button = host.querySelector('button[aria-label="查看推薦規則"]');
    const dialog = host.querySelector("dialog");
    assert.equal(button.type, "button");
    assert.equal(dialog.open, false);
    assert.doesNotMatch(host.querySelector("form").textContent, /不能自行修改|不代表社團承諾/);
    await act(async () => { button.focus(); button.click(); });
    assert.equal(dialog.open, true);
    assert.match(dialog.textContent, /每週最多推薦 3 款/);
    assert.match(dialog.textContent, /60 秒/);
    await act(async () => dialog.dispatchEvent(new dom.window.Event("cancel", { bubbles: false, cancelable: true })));
    assert.equal(dialog.open, false);
    await act(async () => button.click());
    await act(async () => host.querySelector('button[aria-label="關閉對話框"]').click());
    assert.equal(dialog.open, false);
    assert.equal(input.value, "保留中的桌遊");
    assert.equal(calls, 0);
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  });
});

test("failed submission preserves fields and request ID; successful receipt clears the form", async () => {
  await withDom(async ({ dom, host, root }) => {
    const calls = []; let succeed = false; let refreshes = 0;
    const { PurchaseSuggestionForm } = load("src/components/(authenticated)/purchase-suggestions/PurchaseSuggestionForm.tsx", {
      "next/navigation": { useRouter: () => ({ refresh: () => { refreshes++; } }) },
      "@/libs/api/client": { apiClient: async (url, options) => { calls.push({ url, ...options }); if (!succeed) throw new Error("response lost"); return { data: {} }; } },
    });
    await act(async () => root.render(createElement(PurchaseSuggestionForm, { remaining: 3 })));
    const form = host.querySelector("form");
    const name = host.querySelector('[name="game_name"]');
    const reason = host.querySelector('[name="reason"]');
    name.value = "合成測試桌遊"; reason.value = "這是一款適合社團一起遊玩的合成桌遊。";
    const send = () => act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    await send();
    assert.equal(name.value, "合成測試桌遊");
    assert.match(host.textContent, /暫時無法確認/);
    assert.equal(host.querySelector('button[type="submit"]').disabled, false);
    succeed = true; await send();
    assert.equal(calls.length, 2);
    assert.equal(calls[0].body.request_id, calls[1].body.request_id);
    assert.equal(name.value, ""); assert.equal(reason.value, "");
    assert.match(host.textContent, /已收到你的推薦/); assert.equal(refreshes, 1);
  });
});

test("server field errors appear below the field, preserve input and clear after retry", async () => {
  await withDom(async ({ dom, host, root }) => {
    const { ApiError } = load("src/libs/api/errors.tsx");
    let fail = true;
    const calls = [];
    const { PurchaseSuggestionForm } = load("src/components/(authenticated)/purchase-suggestions/PurchaseSuggestionForm.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/libs/api/errors": { ApiError },
      "@/libs/api/client": { apiClient: async (url, options) => {
        calls.push({ url, ...options });
        if (fail) throw new ApiError("請檢查輸入內容", 400, { reason: ["推薦理由不符合伺服器規則"], user_id: ["不應顯示"] });
        return {};
      } },
    });
    await act(async () => root.render(createElement(PurchaseSuggestionForm, { remaining: 3 })));
    host.querySelector('[name="game_name"]').value = "測試桌遊";
    const reason = host.querySelector('[name="reason"]');
    reason.value = "這款桌遊很適合社團同樂";
    const send = () => act(async () => {
      host.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    });
    await send();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    assert.equal(host.querySelector("#suggest-reason-error").textContent, "推薦理由不符合伺服器規則");
    assert.equal(reason.value, "這款桌遊很適合社團同樂");
    assert.equal(document.activeElement, reason);
    assert.doesNotMatch(host.textContent, /不應顯示/);
    fail = false;
    await send();
    assert.equal(calls[0].url, "/api/board-games/suggest");
    assert.equal(calls[0].body.request_id, calls[1].body.request_id);
    assert.equal(host.querySelector("#suggest-reason-error"), null);
    assert.equal(reason.value, "");
  });
});

test("short reasons show a field error with the missing character count and never submit", async () => {
  await withDom(async ({ dom, host, root }) => {
    let calls = 0;
    const { PurchaseSuggestionForm } = load("src/components/(authenticated)/purchase-suggestions/PurchaseSuggestionForm.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/libs/api/client": { apiClient: async () => { calls++; } },
    });
    await act(async () => root.render(createElement(PurchaseSuggestionForm, { remaining: 3 })));
    host.querySelector('[name="game_name"]').value = "測試桌遊";
    const reason = host.querySelector('[name="reason"]');
    const form = host.querySelector("form");
    for (const [value, length] of [["好玩", 2], ["  😀😀  ", 2], ["   ", 0]]) {
      reason.value = value;
      await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      const error = host.querySelector("#suggest-reason-error");
      assert.ok(error.className.includes("--status-danger"));
      assert.match(error.textContent, new RegExp(`推薦理由至少需要 10 字，目前 ${length} 字，還差 ${10 - length} 字`));
      assert.equal(reason.getAttribute("aria-invalid"), "true");
      assert.equal(document.activeElement, reason);
      assert.equal(calls, 0);
    }
    reason.value = "這款桌遊很適合社團同樂";
    await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    assert.equal(host.querySelector("#suggest-reason-error"), null);
    assert.equal(calls, 1);
  });
});

test("direct status action only updates after confirmation", async () => {
  await withDom(async ({ host, root }) => {
    const calls = [];
    const { PurchaseSuggestionActions } = load("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionActions.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/libs/api/client": { apiClient: async (url, options) => { calls.push({ url, ...options }); } },
    });
    await act(async () => root.render(createElement(PurchaseSuggestionActions, { id: "test-id", status: "rejected", version: 4 })));
    const click = async (label) => act(async () => [...host.querySelectorAll("button")].find((button) => button.textContent === label).click());
    assert.deepEqual([...host.querySelectorAll("button")].filter((button) => !button.closest("dialog")).map((button) => button.textContent), ["已購入", "刪除"]);
    await click("已購入");
    assert.equal(host.querySelector("select"), null);
    assert.equal(calls.length, 0);
    await click("取消");
    assert.equal(calls.length, 0);
    await click("已購入");
    await click("確認");
    assert.deepEqual(calls[0].body, { action: "purchased", version: 4 });
    assert.equal(host.querySelector("dialog").open, false);
  });
});

test("admin deletion requires confirmation, preserves conflict feedback and submits version", async () => {
  await withDom(async ({ host, root }) => {
    const calls = [];
    let fail = true;
    const { ApiError } = load("src/libs/api/errors.tsx");
    const { PurchaseSuggestionActions } = load("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionActions.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/libs/api/errors": { ApiError },
      "@/libs/api/client": { apiClient: async (url, options) => {
        calls.push({ url, ...options });
        if (fail === "server") throw new ApiError("操作暫時無法完成\n錯誤追蹤碼：bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", 500);
        if (fail) throw new ApiError("紀錄已被其他幹部處理，請重新整理後再操作", 409);
        return {};
      } },
      "@/components/ConfirmDialog": { ConfirmDialog: ({ open, onConfirm, onClose, description, children }) => open ? createElement("section", { "data-dialog": true }, description, children, createElement("button", { "data-confirm": true, onClick: onConfirm }, "確認"), createElement("button", { "data-cancel": true, onClick: onClose }, "取消")) : null },
    });
    await act(async () => root.render(createElement(PurchaseSuggestionActions, { id: "test-id", status: "pending", version: 4 })));
    const deleteButton = [...host.querySelectorAll("button")].find((button) => button.textContent === "刪除");
    assert.deepEqual([...host.querySelectorAll("button")].map((button) => button.textContent), ["已購入", "不採納", "刪除"]);
    await act(async () => deleteButton.click());
    assert.equal(calls.length, 0); assert.match(host.textContent, /資料仍保留/);
    await act(async () => host.querySelector("[data-cancel]").click());
    assert.equal(calls.length, 0);
    await act(async () => deleteButton.click());
    await act(async () => host.querySelector("[data-confirm]").click());
    assert.equal(calls[0].url, "/api/admin/board-games/suggests/test-id");
    assert.deepEqual(calls[0].body, { action: "delete", version: 4 });
    assert.match(host.querySelector("[data-dialog]").textContent, /紀錄已被其他幹部處理/);
    assert.equal(host.querySelectorAll('[role="alert"]').length, 1);
    fail = "server";
    await act(async () => host.querySelector("[data-confirm]").click());
    assert.equal(host.querySelectorAll("code").length, 1);
    assert.equal(host.querySelector("code").textContent, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    assert.ok(host.querySelector('button[aria-label="複製追蹤碼"]'));
    fail = false;
    await act(async () => host.querySelector("[data-confirm]").click());
    assert.equal(host.querySelector("[data-dialog]"), null);
  });
});
