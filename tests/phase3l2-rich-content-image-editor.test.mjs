import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
const src = "https://project-ref.supabase.co/storage/v1/object/public/rich-content-images/uploads/2026/09/123e4567-e89b-42d3-a456-426614174000.webp";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
for (const key of ["window", "document", "navigator", "Node", "Element", "HTMLElement", "MutationObserver", "DOMParser", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "FormData"])
  Object.defineProperty(globalThis, key, { configurable: true, value: typeof dom.window[key] === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { if (this.open) { this.open = false; this.dispatchEvent(new window.Event("close")); } };
const rect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
dom.window.Range.prototype.getBoundingClientRect = rect;
dom.window.Range.prototype.getClientRects = () => [];
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const tiptap = createRequire(import.meta.url)("@tiptap/react");

after(() => dom.window.close());

async function mountEditor(t, fetchImpl) {
  let instance;
  const Component = load("src/components/RichTextEditor.tsx", { "@tiptap/react": {
    ...tiptap,
    useEditor(options) { instance = tiptap.useEditor(options); return instance; },
  } }).RichTextEditor;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const previousFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  await React.act(async () => root.render(React.createElement(Component, {
    id: "image-editor",
    label: "公告內容",
    initialContent: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "段落 A" }] },
      { type: "paragraph", content: [{ type: "text", text: "段落 B" }] },
    ] },
    onChange() {},
  })));
  await React.act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  t.after(async () => {
    globalThis.fetch = previousFetch;
    await React.act(async () => root.unmount());
    host.remove();
  });
  return { host, get editor() { return instance; } };
}

function setInput(input, value) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function selectFile(input, file) {
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
}

test("image toolbar uploads once and inserts at the captured document position", async (t) => {
  let uploads = 0;
  let finish;
  const ui = await mountEditor(t, () => {
    uploads++;
    return new Promise((resolve) => { finish = () => resolve(Response.json({ data: { src } }, { status: 201 })); });
  });
  await React.act(async () => {
    ui.editor.commands.setTextSelection(7);
    ui.host.querySelector('button[aria-label="插入圖片"]').click();
  });
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("插入圖片"));
  assert.ok(dialog);
  const file = new window.File([Uint8Array.from([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50])], "club.webp", { type: "image/webp" });
  await React.act(async () => {
    selectFile(dialog.querySelector('input[type="file"]'), file);
    setInput(dialog.querySelector('#image-editor-image-alt'), "社員一起遊玩");
    setInput(dialog.querySelector('#image-editor-image-caption'), "九月社課");
  });
  await React.act(async () => [...dialog.querySelectorAll("button")].find((button) => button.textContent === "上傳並插入").click());
  assert.equal(uploads, 1);
  assert.match(dialog.textContent, /上傳中/);
  await React.act(async () => { finish(); await new Promise((resolve) => setTimeout(resolve, 10)); });
  assert.deepEqual(ui.editor.getJSON().content.map((node) => node.type), ["paragraph", "image", "paragraph"]);
  assert.equal(ui.editor.getJSON().content[1].attrs.caption, "九月社課");
});

test("selected image edits canonical attrs without upload and can be deleted", async (t) => {
  const ui = await mountEditor(t, () => assert.fail("editing must not upload"));
  await React.act(async () => ui.editor.commands.insertContentAt(7, { type: "image", attrs: { src, alt: "原說明", caption: null } }));
  let position;
  ui.editor.state.doc.descendants((node, pos) => { if (node.type.name === "image") position = pos; });
  await React.act(async () => {
    ui.editor.commands.setNodeSelection(position);
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  await React.act(async () => ui.host.querySelector('button[aria-label="編輯圖片"]').click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("編輯圖片"));
  assert.equal(dialog.querySelector('input[type="file"]'), null);
  await React.act(async () => {
    dialog.querySelector('input[type="checkbox"]').click();
    setInput(dialog.querySelector('#image-editor-image-caption'), "新標題");
  });
  await React.act(async () => [...dialog.querySelectorAll("button")].find((button) => button.textContent === "儲存圖片設定").click());
  const node = ui.editor.state.doc.nodeAt(position);
  assert.deepEqual({ ...node.attrs }, { src, alt: "", caption: "新標題" });
  await React.act(async () => {
    ui.editor.commands.setNodeSelection(position);
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  await React.act(async () => ui.host.querySelector('button[aria-label="編輯圖片"]').click());
  const secondDialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("編輯圖片"));
  await React.act(async () => {
    secondDialog.querySelector('input[type="checkbox"]').click();
    setInput(secondDialog.querySelector('#image-editor-image-caption'), "");
    [...secondDialog.querySelectorAll("button")].find((button) => button.textContent === "儲存圖片設定").click();
  });
  assert.match(secondDialog.textContent, /請輸入圖片說明/);
  await React.act(async () => setInput(secondDialog.querySelector('#image-editor-image-alt'), "更新說明"));
  await React.act(async () => [...secondDialog.querySelectorAll("button")].find((button) => button.textContent === "儲存圖片設定").click());
  assert.deepEqual({ ...ui.editor.state.doc.nodeAt(position).attrs }, { src, alt: "更新說明", caption: null });
  await React.act(async () => { ui.editor.commands.setNodeSelection(position); ui.editor.commands.deleteSelection(); });
  assert.equal(ui.editor.getJSON().content.some((item) => item.type === "image"), false);
});

test("failed upload inserts no image and paste/drop image files are blocked", async (t) => {
  const ui = await mountEditor(t, async () => Response.json({ message: "上傳暫時失敗" }, { status: 500 }));
  await React.act(async () => ui.host.querySelector('button[aria-label="插入圖片"]').click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("插入圖片"));
  await React.act(async () => {
    selectFile(dialog.querySelector('input[type="file"]'), new window.File(["x"], "x.png", { type: "image/png" }));
    setInput(dialog.querySelector('#image-editor-image-alt'), "測試");
    [...dialog.querySelectorAll("button")].find((button) => button.textContent === "上傳並插入").click();
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  assert.match(dialog.textContent, /上傳暫時失敗/);
  assert.equal(ui.editor.getJSON().content.some((item) => item.type === "image"), false);
  const imageFile = new window.File(["x"], "x.png", { type: "image/png" });
  assert.equal(ui.editor.options.editorProps.handlePaste(null, { clipboardData: { files: [imageFile] } }), true);
  assert.equal(ui.editor.options.editorProps.handleDrop(null, { dataTransfer: { files: [imageFile] } }), true);
  assert.equal(ui.editor.options.editorProps.handlePaste(null, { clipboardData: { files: [] } }), false);
});

test("image form rejects missing, empty, unsupported and oversized files before fetch", async (t) => {
  let requests = 0;
  const ui = await mountEditor(t, async () => { requests++; return Response.json({ data: { src } }); });
  await React.act(async () => ui.host.querySelector('button[aria-label="插入圖片"]').click());
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("插入圖片"));
  const submit = () => [...dialog.querySelectorAll("button")].find((button) => button.textContent === "上傳並插入").click();
  await React.act(async () => submit());
  assert.match(dialog.textContent, /請選擇一張圖片/);
  for (const [file, message] of [
    [new window.File([], "empty.png", { type: "image/png" }), /空白檔案/],
    [new window.File(["gif"], "animated.gif", { type: "image/gif" }), /僅支援 JPEG、PNG 或 WebP/],
    [new window.File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }), /不得超過 4 MiB/],
  ]) {
    await React.act(async () => { selectFile(dialog.querySelector('input[type="file"]'), file); submit(); });
    assert.match(dialog.textContent, message);
  }
  assert.equal(requests, 0);
});

test("invalidated captured position falls back deterministically inside the current document", async (t) => {
  let finish;
  const ui = await mountEditor(t, () => new Promise((resolve) => {
    finish = () => resolve(Response.json({ data: { src } }, { status: 201 }));
  }));
  await React.act(async () => {
    ui.editor.commands.setTextSelection(7);
    ui.host.querySelector('button[aria-label="插入圖片"]').click();
  });
  const dialog = [...ui.host.querySelectorAll("dialog")].find((item) => item.open && item.textContent.includes("插入圖片"));
  await React.act(async () => {
    selectFile(dialog.querySelector('input[type="file"]'), new window.File(["png"], "x.png", { type: "image/png" }));
    setInput(dialog.querySelector('#image-editor-image-alt'), "替代文字");
    [...dialog.querySelectorAll("button")].find((button) => button.textContent === "上傳並插入").click();
  });
  await React.act(async () => ui.editor.commands.setContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "短" }] }] }));
  await React.act(async () => { finish(); await new Promise((resolve) => setTimeout(resolve, 10)); });
  assert.deepEqual(ui.editor.getJSON().content.map((node) => node.type), ["paragraph", "image"]);
});
