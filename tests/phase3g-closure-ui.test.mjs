import assert from "node:assert/strict";
import { test, after } from "node:test";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";
const dom = new JSDOM("<html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "DOMException"]) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event("close")); };
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { renderToStaticMarkup } = await import("react-dom/server");
after(() => dom.window.close());

async function mount(t, failure) {
  const calls = [];
  let timer;
  const originalTimeout = window.setTimeout;
  window.setTimeout = (fn, delay, ...args) => delay === 1200 ? (timer = fn, 0) : originalTimeout.call(window, fn, delay, ...args);
  const { AccountClosureSection } = load("src/components/(authenticated)/settings/AccountClosureSection.tsx", {
    "@/libs/api/client": { apiClient: async (...args) => { calls.push(args); if (failure) throw failure; return { data: { success: true } }; } },
  });
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(AccountClosureSection)));
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); window.setTimeout = originalTimeout; });
  const click = (label) => React.act(async () => [...host.querySelectorAll("button")].find(b => b.textContent === label).click());
  const fill = (id, text) => React.act(async () => {
    const input = host.querySelector(id);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, text);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  return { host, calls, click, fill, get timer() { return timer; } };
}
test("closure modal requires both fields, preserves cancellation, and never submits on open", async t => {
  const ui = await mount(t); await ui.click("註銷帳號");
  assert.ok(ui.host.querySelector("dialog").open);
  assert.equal(ui.host.querySelector('button[type="submit"]').disabled, true);
  await ui.fill("#closure-password", "secret"); await ui.fill("#closure-confirmation", "註銷帳號");
  assert.equal(ui.host.querySelector('button[type="submit"]').disabled, false);
  await ui.click("取消"); assert.equal(ui.host.querySelector("dialog").open, false);
  assert.deepEqual(ui.calls, []);
  await ui.click("註銷帳號"); assert.equal(ui.host.querySelector("#closure-password").value, "");
});
test("closure success waits for API, shows safe feedback, schedules full navigation without auth fetch", async t => {
  const ui = await mount(t); await ui.click("註銷帳號");
  await ui.fill("#closure-password", "secret"); await ui.fill("#closure-confirmation", "註銷帳號");
  await ui.click("確認註銷");
  assert.deepEqual(ui.calls, [["/api/users/me/closure", { method: "POST", body: { currentPassword: "secret", confirmation: "註銷帳號" } }]]);
  assert.match(ui.host.textContent, /帳號已註銷/);
  assert.equal(typeof ui.timer, "function");
  assert.equal(ui.host.querySelector('input[type="password"]'), null);
});
test("blocking response leaves modal open and does not navigate or claim success", async t => {
  const ui = await mount(t, new Error("目前仍有待處理或尚未歸還的桌遊")); await ui.click("註銷帳號");
  await ui.fill("#closure-password", "secret"); await ui.fill("#closure-confirmation", "註銷帳號"); await ui.click("確認註銷");
  assert.ok(ui.host.querySelector("dialog").open); assert.match(ui.host.textContent, /目前仍有待處理/);
  assert.doesNotMatch(ui.host.textContent, /帳號已註銷/); assert.equal(ui.timer, undefined);
});
for (const closed of [false, true]) test(`Admin account/profile/history composition: closed=${closed}`, async () => {
  let verificationReads = 0;
  const user = { id: "user", name: closed ? "已註銷使用者" : "會員", email: "closed-random@account.invalid", closed_at: closed ? "2026-09-14" : null, email_verified_at: null, created_at: "2026-09-01", updated_at: "2026-09-14", profile: null, memberships: [], officer_positions: [] };
  const Page = load("src/app/(admin)/admin/users/[id]/page.tsx", {
    "@/libs/observability/server-render": { withServerErrorReference: fn => fn },
    "@/services/users/users.service": { usersService: { getUserForAdmin: async () => user, getActivityCountsForAdmin: async () => ({ borrowings: 4, openBorrowings: 0, attendances: 6 }) } },
    "@/services/email-verification/email-verification-operations.service": { getLatestVerificationForAdmin: async () => { verificationReads++; return null; } },
    "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
    "next/navigation": { useRouter: () => ({ refresh() {} }), notFound() { throw new Error("not found"); } },
  }).default;
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "user" }), searchParams: Promise.resolve({ returnTo: "/admin/users?page=3" }) }));
  for (const label of ["帳號資料", "個人資料", "社員紀錄", "幹部紀錄", "借用與活動紀錄", "4 筆", "6 筆"]) assert.ok(html.includes(label), label);
  assert.ok(html.includes("/admin/users?page=3"));
  if (closed) {
    assert.doesNotMatch(html, /closed-random|編輯個人資料|編輯帳號資料|最近驗證信/);
    assert.match(html, /已註銷使用者/); assert.equal(verificationReads, 0);
  } else { assert.match(html, /編輯個人資料/); assert.match(html, /編輯帳號資料/); assert.equal(verificationReads, 1); }
});

test("Admin account modal edits only the display name and has no URL mutation field", async t => {
  const calls = [];
  let refreshes = 0;
  const Component = load("src/components/(admin)/admin/users/UserAccountEditButton.tsx", {
    "@/libs/api/client": { apiClient: async (...args) => { calls.push(args); } },
    "next/navigation": { useRouter: () => ({ refresh() { refreshes++; } }) },
  }).UserAccountEditButton;
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(Component, { user: { id: "id", name: "原名稱", avatar: "https://example.com/old.png", closed_at: null } })));
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); });
  const click = label => React.act(async () => [...host.querySelectorAll("button")].find(b => b.textContent === label).click());
  const fill = (id, value) => React.act(async () => {
    const input = host.querySelector(id);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  await click("編輯帳號資料");
  assert.equal(host.querySelectorAll("input").length, 1);
  assert.equal(host.querySelector("#admin-account-avatar"), null);
  await fill("#admin-account-name", "新名稱");
  await click("儲存");
  assert.deepEqual(calls[0], ["/api/admin/users/id/account", { method: "PATCH", body: { name: "新名稱" } }]);
  await click("編輯帳號資料"); await fill("#admin-account-name", "取消內容"); await click("取消");
  assert.equal(calls.length, 1); assert.equal(refreshes, 1);
});
