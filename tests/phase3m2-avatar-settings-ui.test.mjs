import assert from "node:assert/strict";
import { File } from "node:buffer";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, HTMLDialogElement: dom.window.HTMLDialogElement, DOMException: dom.window.DOMException });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event("close")); };
const React = await import("react");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");

const USER = { id: "123e4567-e89b-42d3-a456-426614174000", name: "測試社員", avatar: null };
const PNG = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "avatar.png", { type: "image/png" });

function button(root, label) {
  return [...root.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === label);
}

async function renderAvatar(t, { user = USER, endpoint = "/api/users/me/avatar", admin = false } = {}) {
  const refreshes = [], revoked = [];
  let sequence = 0;
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => `blob:avatar-${++sequence}`;
  URL.revokeObjectURL = (value) => revoked.push(value);
  const Component = load("src/components/avatars/AvatarManagement.tsx", {
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes.push(true) }) },
    "@/components/UserAvatar": { UserAvatar: ({ user: value, className }) => React.createElement("span", { "data-testid": "avatar", "data-avatar": value.avatar ?? "fallback", className }, value.name) },
  }).AvatarManagement;
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(Component, { user, endpoint, admin })));
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; });
  return { host, refreshes, revoked };
}

async function selectFile(root, file) {
  const input = root.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await React.act(async () => input.dispatchEvent(new window.Event("change", { bubbles: true })));
}

test("compact Settings state uses a 64px avatar, upload fallback, and conditional remove", async (t) => {
  const empty = await renderAvatar(t);
  assert.match(empty.host.querySelector('[data-testid="avatar"]').className, /size-16/);
  assert.ok(button(empty.host, "上傳頭像"));
  assert.equal(button(empty.host, "移除"), undefined);
  const existing = await renderAvatar(t, { user: { ...USER, avatar: "https://external.example/avatar.jpg" } });
  assert.ok(button(existing.host, "更換頭像"));
  assert.ok(button(existing.host, "移除"));
  assert.doesNotMatch(existing.host.innerHTML, /surface-subtle[^>]*p-(?:3|4)[^>]*sm:p/);
});

test("selection previews the actual file and POSTs it to the configured endpoint once", async (t) => {
  const ui = await renderAvatar(t, { endpoint: "/api/admin/users/123/avatar", admin: true });
  await React.act(async () => button(ui.host, "上傳頭像").click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open);
  await selectFile(dialog, PNG);
  assert.match(dialog.textContent, /avatar\.png/);
  assert.ok(dialog.querySelector('img[alt="待上傳的頭像預覽"]'));
  const requests = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { requests.push([url, init]); return Response.json({ data: { avatar: "https://project.supabase.co/storage/v1/object/public/avatars/123/new.png" } }); };
  await React.act(async () => { button(dialog, "上傳頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(requests.length, 1); assert.equal(requests[0][0], "/api/admin/users/123/avatar");
  assert.equal(requests[0][1].method, "POST"); assert.equal(requests[0][1].body.get("file"), PNG);
  assert.equal(ui.refreshes.length, 1); assert.deepEqual(ui.revoked, ["blob:avatar-1"]);
  globalThis.fetch = oldFetch;
});

test("invalid files stay local and failed uploads retain the preview for retry", async (t) => {
  const ui = await renderAvatar(t);
  await React.act(async () => button(ui.host, "上傳頭像").click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open);
  for (const file of [new File([], "empty.png", { type: "image/png" }), new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), new File(["gif"], "avatar.gif", { type: "image/gif" })]) {
    await selectFile(dialog, file); assert.equal(dialog.querySelector("img"), null);
  }
  await selectFile(dialog, PNG);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: "上傳失敗" }, { status: 500 });
  await React.act(async () => { button(dialog, "上傳頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.ok(dialog.open); assert.match(dialog.textContent, /avatar\.png/); assert.match(dialog.textContent, /上傳失敗/);
  globalThis.fetch = oldFetch;
});

test("canonical and legacy avatars both require confirmation before DELETE", async (t) => {
  for (const avatar of ["https://external.example/avatar.jpg", "https://project.supabase.co/storage/v1/object/public/avatars/123/uuid.webp"]) {
    const ui = await renderAvatar(t, { user: { ...USER, avatar } });
    let request;
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async (...args) => { request = args; return Response.json({ data: { avatar: null } }); };
    await React.act(async () => button(ui.host, "移除").click());
    assert.equal(request, undefined);
    const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("移除頭像？"));
    await React.act(async () => { button(dialog, "移除頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    assert.equal(request[0], "/api/users/me/avatar"); assert.equal(request[1].method, "DELETE");
    assert.equal(ui.host.querySelector('[data-testid="avatar"]').dataset.avatar, "fallback");
    assert.equal(button(ui.host, "移除"), undefined);
    globalThis.fetch = oldFetch;
  }
});

test("admin removal copy identifies the target user and failures preserve the avatar", async (t) => {
  const avatar = "https://external.example/avatar.jpg";
  const ui = await renderAvatar(t, { user: { ...USER, avatar }, endpoint: `/api/admin/users/${USER.id}/avatar`, admin: true });
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: "移除失敗" }, { status: 500 });
  await React.act(async () => button(ui.host, "移除").click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open);
  assert.match(dialog.textContent, /移除這位使用者的頭像？/);
  await React.act(async () => { button(dialog, "移除頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(ui.host.querySelector('[data-testid="avatar"]').dataset.avatar, avatar);
  assert.ok(dialog.open); assert.match(dialog.textContent, /移除失敗/);
  globalThis.fetch = oldFetch;
});

test("409 refreshes authoritative state without exposing CAS terminology", async (t) => {
  const ui = await renderAvatar(t);
  await React.act(async () => button(ui.host, "上傳頭像").click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open);
  await selectFile(dialog, PNG);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: "conflict" }, { status: 409 });
  await React.act(async () => { button(dialog, "上傳頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.match(dialog.textContent, /其他操作中更新/); assert.doesNotMatch(dialog.textContent, /CAS/); assert.equal(ui.refreshes.length, 1);
  globalThis.fetch = oldFetch;
});
