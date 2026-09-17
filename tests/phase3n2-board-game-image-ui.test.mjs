import assert from "node:assert/strict";
import { File } from "node:buffer";
import { after, test } from "node:test";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node"]) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
after(() => dom.window.close());

const GAME_ID = "00000000-0000-4000-8000-000000000003";
const initial = { name: "測試桌遊", inventory_number: "608", category_id: "00000000-0000-4000-8000-000000000001", location_id: "00000000-0000-4000-8000-000000000002" };
const PNG = new File([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])], "cover.png", { type: "image/png" });

function button(host, label) { return [...host.querySelectorAll("button")].find((item) => item.textContent?.trim() === label); }

async function mount(t, { mode = "create", image = null, apiImpl } = {}) {
  const calls = [], paths = [], refreshes = [], revoked = [];
  let objectUrl = 0;
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => `blob:cover-${++objectUrl}`;
  URL.revokeObjectURL = (value) => revoked.push(value);
  const BoardGameForm = load("src/components/(admin)/admin/board-games/BoardGameForm.tsx", {
    "next/navigation": { useRouter: () => ({ push: (path) => paths.push(path), refresh: () => refreshes.push(true) }) },
    "next/dynamic": { default: () => (props) => React.createElement("div", { "aria-label": props.label }) },
    "@/components/BoardGameImage": { BoardGameImage: ({ boardGame, className }) => React.createElement("span", { "data-testid": "persisted-cover", "data-image": boardGame.image ?? "fallback", className }) },
    "@/components/ConfirmDialog": { ConfirmDialog: ({ open, onConfirm, title, confirmLabel, children }) => open ? React.createElement("div", { role: "dialog", "aria-label": title }, children, React.createElement("button", { type: "button", onClick: onConfirm }, confirmLabel)) : null },
    "@/libs/api/client": { apiClient: async (...args) => { calls.push(args); return apiImpl ? apiImpl(...args) : { data: { id: GAME_ID } }; } },
  }).BoardGameForm;
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(BoardGameForm, { mode, boardGameId: mode === "edit" ? GAME_ID : undefined, initialImage: image, initialValues: initial, categories: [{ id: initial.category_id, name: "策略" }], locations: [{ id: initial.location_id, name: "社辦" }], returnTo: "/admin/board-games" })));
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; });
  return { host, calls, paths, refreshes, revoked };
}

async function selectFile(host, file) {
  const input = host.querySelector('input[type="file"]');
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  await React.act(async () => input.dispatchEvent(new window.Event("change", { bubbles: true })));
}
async function submit(host) { await React.act(async () => { host.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 0)); }); }

test("selection validates locally, previews, reselects, and revokes object URLs", async (t) => {
  const ui = await mount(t);
  await selectFile(ui.host, PNG);
  assert.ok(ui.host.querySelector('img[alt="待上傳的桌遊封面預覽"]'));
  assert.match(ui.host.textContent, /cover\.png/);
  assert.ok(ui.host.querySelector('input[accept="image/jpeg,image/png,image/webp"]'));
  await selectFile(ui.host, new File(["gif"], "bad.gif", { type: "image/gif" }));
  assert.match(ui.host.textContent, /僅支援 JPG、PNG 或 WebP/);
  assert.match(ui.host.textContent, /cover\.png/);
  await selectFile(ui.host, new File([Uint8Array.from([1])], "next.webp", { type: "image/webp" }));
  assert.deepEqual(ui.revoked, ["blob:cover-1"]);
  await selectFile(ui.host, new File([Uint8Array.from([0xff,0xd8,0xff])], "next.jpg", { type: "image/jpeg" }));
  assert.match(ui.host.textContent, /next\.jpg/);
  await selectFile(ui.host, new File([], "empty.png", { type: "image/png" }));
  assert.match(ui.host.textContent, /不可為空/);
  await selectFile(ui.host, new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }));
  assert.match(ui.host.textContent, /不可超過 4 MB/);
});

test("create uploads only after JSON create and uses the returned ID", async (t) => {
  const ui = await mount(t); await selectFile(ui.host, PNG);
  const requests = []; const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { requests.push([url, init]); return Response.json({ data: { image: "https://project.supabase.co/cover.png" } }); };
  await submit(ui.host); globalThis.fetch = oldFetch;
  assert.equal(ui.calls.length, 1); assert.equal(ui.calls[0][0], "/api/admin/board-games");
  assert.equal("image" in ui.calls[0][1].body, false);
  assert.equal(requests[0][0], `/api/admin/board-games/${GAME_ID}/image`);
  assert.equal(requests[0][1].method, "POST"); assert.equal(requests[0][1].body.get("file"), PNG);
  assert.deepEqual(ui.paths, ["/admin/board-games"]);
});

test("create partial success cannot create a duplicate and routes to the created edit page", async (t) => {
  const ui = await mount(t); await selectFile(ui.host, PNG);
  const oldFetch = globalThis.fetch; globalThis.fetch = async () => Response.json({ message: "upload failed" }, { status: 500 });
  await submit(ui.host); await submit(ui.host);
  assert.equal(ui.calls.length, 1); assert.match(ui.host.textContent, /桌遊已建立，但封面圖片上傳失敗/);
  assert.ok(button(ui.host, "前往編輯桌遊"));
  await React.act(async () => button(ui.host, "前往編輯桌遊").click());
  assert.deepEqual(ui.paths, [`/admin/board-games/${GAME_ID}/edit`]); globalThis.fetch = oldFetch;
});

test("rapid create submissions start only one Board Game mutation", async (t) => {
  let resolveCreate;
  const pending = new Promise((resolve) => { resolveCreate = resolve; });
  const ui = await mount(t, { apiImpl: async () => pending });
  await React.act(async () => {
    const form = ui.host.querySelector("form");
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assert.equal(ui.calls.length, 1);
  await React.act(async () => { resolveCreate({ data: { id: GAME_ID } }); await pending; });
});

test("edit keeps persisted cover until replacement succeeds and retries only image after partial success", async (t) => {
  const legacy = "https://external.example/legacy.jpg";
  const ui = await mount(t, { mode: "edit", image: legacy }); await selectFile(ui.host, PNG);
  let attempts = 0; const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => ++attempts === 1 ? Response.json({ message: "upload failed" }, { status: 500 }) : Response.json({ data: { image: "https://project.supabase.co/new.png" } });
  await submit(ui.host);
  assert.equal(ui.calls.length, 1); assert.match(ui.host.textContent, /桌遊資料已儲存，但封面圖片上傳失敗/);
  await submit(ui.host); globalThis.fetch = oldFetch;
  assert.equal(ui.calls.length, 1); assert.equal(attempts, 2); assert.deepEqual(ui.paths, ["/admin/board-games"]);
});

test("removal requires confirmation and updates canonical or legacy cover only after DELETE success", async (t) => {
  const ui = await mount(t, { mode: "edit", image: "https://external.example/legacy.jpg" });
  await selectFile(ui.host, PNG);
  let request; const oldFetch = globalThis.fetch;
  globalThis.fetch = async (...args) => { request = args; return Response.json({ data: { image: null } }); };
  await React.act(async () => button(ui.host, "移除圖片").click()); assert.equal(request, undefined);
  const dialog = ui.host.querySelector('[role="dialog"]');
  await React.act(async () => { button(dialog, "移除圖片").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(request[0], `/api/admin/board-games/${GAME_ID}/image`); assert.equal(request[1].method, "DELETE");
  assert.equal(ui.host.querySelector('[data-testid="persisted-cover"]').dataset.image, "fallback");
  assert.deepEqual(ui.revoked, ["blob:cover-1"]); globalThis.fetch = oldFetch;
});

test("failed removal keeps the persisted cover visible", async (t) => {
  const legacy = "https://external.example/legacy.jpg";
  const ui = await mount(t, { mode: "edit", image: legacy });
  const oldFetch = globalThis.fetch; globalThis.fetch = async () => Response.json({ message: "移除失敗" }, { status: 400 });
  await React.act(async () => button(ui.host, "移除圖片").click());
  const dialog = ui.host.querySelector('[role="dialog"]');
  await React.act(async () => { button(dialog, "移除圖片").click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  assert.equal(ui.host.querySelector('[data-testid="persisted-cover"]').dataset.image, legacy);
  assert.match(dialog.textContent, /移除失敗/); globalThis.fetch = oldFetch;
});

test("409 uses understandable copy and refreshes authoritative state", async (t) => {
  const ui = await mount(t, { mode: "edit", image: "https://external.example/legacy.jpg" }); await selectFile(ui.host, PNG);
  const oldFetch = globalThis.fetch; globalThis.fetch = async () => Response.json({ message: "conflict" }, { status: 409 });
  await submit(ui.host); globalThis.fetch = oldFetch;
  assert.match(ui.host.textContent, /其他操作中更新/); assert.doesNotMatch(ui.host.textContent, /CAS/); assert.equal(ui.refreshes.length, 1);
});
