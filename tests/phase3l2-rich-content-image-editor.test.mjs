import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
const src = "https://project-ref.supabase.co/storage/v1/object/public/rich-content-images/uploads/2026/09/123e4567-e89b-42d3-a456-426614174000.webp";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
for (const key of ["window","document","navigator","Node","Element","HTMLElement","MutationObserver","DOMParser","getComputedStyle","requestAnimationFrame","cancelAnimationFrame","FormData"])
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.URL.createObjectURL = () => "blob:http://localhost/test-image";
globalThis.URL.revokeObjectURL = () => undefined;
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const tiptap = createRequire(import.meta.url)("@tiptap/react");
after(() => dom.window.close());
async function mountEditor(t, fetchImpl) {
  let instance;
  const Component = load("src/components/RichTextEditor.tsx", { "@tiptap/react": { ...tiptap, useEditor(options) { instance = tiptap.useEditor(options); return instance; } } }).RichTextEditor;
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host); const previousFetch = globalThis.fetch; globalThis.fetch = fetchImpl;
  await React.act(async () => root.render(React.createElement(Component, { id: "image-editor", label: "內容", initialContent: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "段落 A" }] }, { type: "paragraph", content: [{ type: "text", text: "段落 B" }] }] }, onChange() {} })));
  await React.act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
  t.after(async () => { globalThis.fetch = previousFetch; await React.act(async () => root.unmount()); host.remove(); });
  return { host, get editor() { return instance; } };
}
function selectFile(input, file) { Object.defineProperty(input, "files", { configurable: true, value: [file] }); input.dispatchEvent(new window.Event("change", { bubbles: true })); }
async function settle() { await React.act(async () => new Promise((resolve) => setTimeout(resolve, 20))); }

test("toolbar file selection uploads and inserts once", async (t) => {
  let requests = 0; const ui = await mountEditor(t, async () => { requests++; return Response.json({ data: { src } }, { status: 201 }); });
  await React.act(async () => { ui.editor.commands.setTextSelection(7); selectFile(ui.host.querySelector('input[type="file"]'), new window.File(["png"], "image.png", { type: "image/png" })); }); await settle();
  assert.equal(requests, 1); assert.equal(ui.editor.getJSON().content.filter((node) => node.type === "image").length, 1); assert.equal(JSON.stringify(ui.editor.getJSON()).includes("blob:"), false);
});

test("clipboard image uses the direct pipeline and text paste remains untouched", async (t) => {
  let requests = 0; const ui = await mountEditor(t, async () => { requests++; return Response.json({ data: { src } }); });
  const event = { clipboardData: { files: [new window.File(["png"], "paste.png", { type: "image/png" })], items: [] }, preventDefault() { this.prevented = true; } };
  await React.act(async () => ui.editor.options.editorProps.handlePaste(ui.editor.view, event)); await settle();
  assert.equal(event.prevented, true); assert.equal(requests, 1); assert.equal(ui.editor.options.editorProps.handlePaste(ui.editor.view, { clipboardData: { files: [] }, preventDefault() { throw new Error("text intercepted"); } }), false);
});

test("image drop uses coordinates and ordinary drop is untouched", async (t) => {
  let requests = 0; const ui = await mountEditor(t, async () => { requests++; return Response.json({ data: { src } }); }); const view = ui.editor.view; view.posAtCoords = () => ({ pos: 7 });
  const event = { dataTransfer: { files: [new window.File(["png"], "drop.png", { type: "image/png" })] }, clientX: 1, clientY: 1, preventDefault() {} };
  await React.act(async () => ui.editor.options.editorProps.handleDrop(view, event)); await settle(); assert.equal(requests, 1); assert.equal(ui.editor.options.editorProps.handleDrop(view, { dataTransfer: { files: [] } }), false);
});

test("invalid and failed uploads do not insert images", async (t) => {
  let requests = 0; const ui = await mountEditor(t, async () => { requests++; return Response.json({ message: "upload failed" }, { status: 500 }); });
  await React.act(async () => ui.editor.options.editorProps.handlePaste(ui.editor.view, { clipboardData: { files: [new window.File(["gif"], "bad.gif", { type: "image/gif" })], items: [] }, preventDefault() {} })); assert.equal(requests, 0);
  await React.act(async () => ui.editor.options.editorProps.handlePaste(ui.editor.view, { clipboardData: { files: [new window.File(["png"], "ok.png", { type: "image/png" })], items: [] }, preventDefault() {} })); await settle(); assert.equal(requests, 1); assert.equal(ui.editor.getJSON().content.some((node) => node.type === "image"), false);
});

test("legacy image data remains readable", async (t) => { const ui = await mountEditor(t, () => assert.fail("legacy read must not upload")); await React.act(async () => ui.editor.commands.insertContentAt(7, { type: "image", attrs: { src, alt: "舊說明", caption: null } })); assert.equal(ui.editor.getJSON().content.some((node) => node.type === "image"), true); });
