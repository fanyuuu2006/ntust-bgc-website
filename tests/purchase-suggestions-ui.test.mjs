import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { load } from "./helpers/load-app-module.mjs";

async function withDom(run) {
  const dom = new JSDOM('<div id="app"></div>', { url: "https://example.test" });
  const previous = { window: globalThis.window, document: globalThis.document, FormData: globalThis.FormData, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true });
  const host = document.getElementById("app");
  const root = createRoot(host);
  try { await run({ dom, host, root }); }
  finally { await act(async () => root.unmount()); Object.assign(globalThis, previous); dom.window.close(); }
}

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

test("admin deletion requires confirmation, preserves conflict feedback and submits version", async () => {
  await withDom(async ({ host, root }) => {
    const calls = [];
    const { PurchaseSuggestionActions } = load("src/components/(admin)/admin/purchase-suggestions/PurchaseSuggestionActions.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/libs/api/client": { apiClient: async (url, options) => { calls.push({ url, ...options }); return {}; } },
      "@/components/ConfirmDialog": { ConfirmDialog: ({ open, onConfirm, onClose, description }) => open ? createElement("section", { "data-dialog": true }, description, createElement("button", { "data-confirm": true, onClick: onConfirm }, "確認"), createElement("button", { "data-cancel": true, onClick: onClose }, "取消")) : null },
    });
    await act(async () => root.render(createElement(PurchaseSuggestionActions, { id: "test-id", status: "pending", version: 4 })));
    const deleteButton = [...host.querySelectorAll("button")].find((button) => button.textContent.includes("刪除推薦"));
    await act(async () => deleteButton.click());
    assert.equal(calls.length, 0); assert.match(host.textContent, /資料仍保留/);
    await act(async () => host.querySelector("[data-cancel]").click());
    assert.equal(calls.length, 0);
    await act(async () => deleteButton.click());
    await act(async () => host.querySelector("[data-confirm]").click());
    assert.deepEqual(calls[0].body, { action: "delete", version: 4 });
    assert.equal(host.querySelector("[data-dialog]"), null);
  });
});

test("notice acknowledgement sends only the observed notice version", async () => {
  await withDom(async ({ host, root }) => {
    const calls = [];
    const { PurchaseNoticeAction } = load("src/components/(authenticated)/purchase-suggestions/PurchaseNoticeAction.tsx", {
      "next/navigation": { useRouter: () => ({ refresh() {} }) },
      "@/libs/api/client": { apiClient: async (url, options) => { calls.push({ url, ...options }); } },
    });
    await act(async () => root.render(createElement(PurchaseNoticeAction, { id: "test-id", noticeVersion: 2 })));
    await act(async () => host.querySelector("button").click());
    assert.equal(calls[0].url, "/api/purchase-suggestions/test-id/read");
    assert.deepEqual(calls[0].body, { notice_version: 2 });
  });
});
