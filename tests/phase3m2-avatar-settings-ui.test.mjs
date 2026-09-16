import assert from "node:assert/strict";
import { File } from "node:buffer";
import { readFileSync } from "node:fs";
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

async function renderAvatar(t, user = USER) {
  const refreshes = [];
  const revoked = [];
  let objectSequence = 0;
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => `blob:avatar-${++objectSequence}`;
  URL.revokeObjectURL = (value) => revoked.push(value);
  const Component = load("src/components/(authenticated)/settings/AvatarSettingsSection.tsx", {
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes.push(true) }) },
    "@/components/UserAvatar": { UserAvatar: ({ user: avatarUser }) => React.createElement("span", { "data-testid": "avatar", "data-avatar": avatarUser.avatar ?? "fallback" }, avatarUser.name) },
  }).AvatarSettingsSection;
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(Component, { user })));
  t.after(async () => {
    await React.act(async () => root.unmount()); host.remove();
    URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke;
  });
  return { host, refreshes, revoked };
}

async function selectFile(host, file) {
  const input = host.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await React.act(async () => input.dispatchEvent(new window.Event("change", { bubbles: true })));
}

test("Settings replaces the self-service URL field with fallback/upload and conditional remove actions", async (t) => {
  const source = readFileSync("src/components/(authenticated)/settings/AccountSettingsForm.tsx", "utf8");
  assert.match(source, /AvatarSettingsSection/);
  assert.doesNotMatch(source, /avatarField|values\.avatar|type:\s*["']url/);

  const empty = await renderAvatar(t);
  const emptyActions = empty.host.querySelector("section > div");
  assert.equal(empty.host.querySelector('[data-testid="avatar"]').dataset.avatar, "fallback");
  assert.ok(button(emptyActions, "上傳頭像"));
  assert.equal(button(emptyActions, "移除頭像"), undefined);
});

test("canonical and legacy avatars both expose replace and confirmed remove", async (t) => {
  for (const avatar of [
    "https://project-ref.supabase.co/storage/v1/object/public/avatars/123e4567-e89b-42d3-a456-426614174000/323e4567-e89b-42d3-a456-426614174000.webp",
    "https://external.example/avatar.jpg",
  ]) {
    const ui = await renderAvatar(t, { ...USER, avatar });
    const actions = ui.host.querySelector("section > div");
    assert.equal(ui.host.querySelector('[data-testid="avatar"]').dataset.avatar, avatar);
    assert.ok(button(actions, "更換頭像"));
    const remove = button(actions, "移除頭像"); assert.ok(remove);
    let request = null;
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => { request = [url, init]; return Response.json({ data: { avatar: null } }); };
    await React.act(async () => remove.click());
    assert.equal(request, null);
    const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("移除頭像？"));
    await React.act(async () => { button(dialog, "移除頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    assert.equal(request[0], "/api/users/me/avatar"); assert.equal(request[1].method, "DELETE");
    assert.equal(ui.host.querySelector('[data-testid="avatar"]').dataset.avatar, "fallback");
    assert.equal(button(ui.host.querySelector("section > div"), "移除頭像"), undefined);
    assert.equal(ui.refreshes.length, 1);
    globalThis.fetch = oldFetch;
  }
});

test("selection previews the actual file, POSTs multipart once, refreshes, and revokes its object URL", async (t) => {
  const ui = await renderAvatar(t);
  await React.act(async () => button(ui.host.querySelector("section > div"), "上傳頭像").click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open);
  const input = dialog.querySelector('input[type="file"]');
  assert.equal(input.accept, "image/jpeg,image/png,image/webp");
  assert.equal(input.classList.contains("sr-only"), false);
  await selectFile(dialog, PNG);
  assert.match(dialog.textContent, /avatar\.png/);
  assert.ok(dialog.querySelector('img[alt="待上傳的頭像預覽"]'));
  assert.match(input.getAttribute("aria-label"), /重新選擇/);

  const requests = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { requests.push([url, init]); return Response.json({ data: { avatar: "https://project-ref.supabase.co/storage/v1/object/public/avatars/new.png" } }); };
  await React.act(async () => { button(dialog, "上傳頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(requests.length, 1); assert.equal(requests[0][0], "/api/users/me/avatar");
  assert.equal(requests[0][1].method, "POST"); assert.ok(requests[0][1].body instanceof FormData);
  assert.equal(requests[0][1].body.get("file"), PNG);
  assert.equal(ui.refreshes.length, 1);
  assert.deepEqual(ui.revoked, ["blob:avatar-1"]);
  globalThis.fetch = oldFetch;
});

test("invalid selections are rejected locally and failed uploads retain the selected preview", async (t) => {
  const ui = await renderAvatar(t);
  await React.act(async () => button(ui.host.querySelector("section > div"), "上傳頭像").click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open);
  for (const file of [new File([], "empty.png", { type: "image/png" }), new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), new File(["gif"], "avatar.gif", { type: "image/gif" })]) {
    await selectFile(dialog, file); assert.equal(dialog.querySelector('img[alt="待上傳的頭像預覽"]'), null);
  }
  await selectFile(dialog, PNG);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: "圖片暫時無法上傳" }, { status: 500 });
  await React.act(async () => { button(dialog, "上傳頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.ok(dialog.open); assert.match(dialog.textContent, /avatar\.png/); assert.ok(dialog.querySelector("img"));
  globalThis.fetch = oldFetch;
});

test("409 responses explain the concurrent update and refresh authoritative state", async (t) => {
  const ui = await renderAvatar(t);
  await React.act(async () => button(ui.host.querySelector("section > div"), "上傳頭像").click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open);
  await selectFile(dialog, PNG);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: "conflict" }, { status: 409 });
  await React.act(async () => { button(dialog, "上傳頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.match(dialog.textContent, /其他操作中更新/); assert.equal(ui.refreshes.length, 1);
  globalThis.fetch = oldFetch;
});

test("pending upload cannot double-submit and a failed remove preserves the current avatar", async (t) => {
  const avatar = "https://external.example/avatar.jpg";
  const ui = await renderAvatar(t, { ...USER, avatar });
  await React.act(async () => button(ui.host.querySelector("section > div"), "更換頭像").click());
  const uploadDialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open);
  await selectFile(uploadDialog, PNG);
  const requests = [];
  let releaseUpload;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (url, init) => {
    requests.push([url, init]);
    return new Promise((resolve) => { releaseUpload = () => resolve(Response.json({ data: { avatar: "https://project-ref.supabase.co/avatar.png" } })); });
  };
  await React.act(async () => { button(uploadDialog, "儲存新頭像").click(); });
  button(uploadDialog, "儲存新頭像").click();
  assert.equal(requests.length, 1);
  await React.act(async () => { releaseUpload(); await new Promise((resolve) => setTimeout(resolve, 0)); });

  const actions = ui.host.querySelector("section > div");
  await React.act(async () => button(actions, "移除頭像").click());
  const removeDialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("移除頭像？"));
  let removeRequests = 0;
  globalThis.fetch = async () => { removeRequests += 1; return Response.json({ message: "暫時無法移除" }, { status: 500 }); };
  await React.act(async () => { button(removeDialog, "移除頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(removeRequests, 1);
  assert.equal(ui.host.querySelector('[data-testid="avatar"]').dataset.avatar, "https://project-ref.supabase.co/avatar.png");
  assert.ok(removeDialog.open);
  assert.match(removeDialog.textContent, /暫時無法移除/);
  globalThis.fetch = oldFetch;
});

test("remove conflict closes confirmation and refreshes the authoritative avatar", async (t) => {
  const ui = await renderAvatar(t, { ...USER, avatar: "https://external.example/avatar.jpg" });
  await React.act(async () => button(ui.host.querySelector("section > div"), "移除頭像").click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("移除頭像？"));
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: "conflict" }, { status: 409 });
  await React.act(async () => { button(dialog, "移除頭像").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(dialog.open, false);
  assert.match(ui.host.textContent, /其他操作中更新/);
  assert.equal(ui.refreshes.length, 1);
  assert.equal(ui.host.querySelector('[data-testid="avatar"]').dataset.avatar, "https://external.example/avatar.jpg");
  globalThis.fetch = oldFetch;
});
