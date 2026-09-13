import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { load } from "./helpers/load-app-module.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost", pretendToBeVisual: true });
for (const key of ["window", "document", "navigator", "Node", "Element", "HTMLElement", "MutationObserver", "DOMParser", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"])
  Object.defineProperty(globalThis, key, { configurable: true, value: typeof dom.window[key] === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? dom.window[key].bind(dom.window) : dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no layout engine. Geometry stubs only let ProseMirror's scrolling run;
// no assertion here is evidence of browser appearance, overflow or touch behavior.
const rect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
dom.window.Range.prototype.getBoundingClientRect = rect;
dom.window.Range.prototype.getClientRects = () => [];
const React = await import("react");
const { createRoot } = await import("react-dom/client");
// The repository TS loader uses CommonJS. Keep ProseMirror on that same module
// instance; mixing its ESM/CJS builds creates duplicate keyed plugins in tests.
const tiptap = createRequire(import.meta.url)("@tiptap/react");
const { createRichTextExtensions } = load("src/components/RichTextEditor.tsx");
const content = load("src/libs/rich-content/content.ts");
const { canonicalEditorContent } = load("src/libs/rich-content/editor-document.ts");
const { announcementInputSchema } = load("src/services/announcements/announcements.schema.ts");
const source = "無限制的虛式";
const initial = () => content.richContentFromPlainText(source);

after(() => dom.window.close());

function editorFor(t, value = initial()) {
  const element = document.createElement("div"); document.body.append(element);
  const editor = new tiptap.Editor({ element, extensions: createRichTextExtensions(), content: value });
  t.after(() => { editor.destroy(); element.remove(); });
  editor.commands.setTextSelection({ from: 1, to: source.length + 1 });
  return editor;
}

const cases = [
  ["bold", (chain) => chain.toggleBold(), "bold", undefined, "strong", (json) => json.content[0].content[0].marks.some((m) => m.type === "bold")],
  ["italic", (chain) => chain.toggleItalic(), "italic", undefined, "em", (json) => json.content[0].content[0].marks.some((m) => m.type === "italic")],
  ["H2", (chain) => chain.setHeading({ level: 2 }), "heading", { level: 2 }, "h2", (json) => json.content[0].attrs.level === 2],
  ["H3", (chain) => chain.setHeading({ level: 3 }), "heading", { level: 3 }, "h3", (json) => json.content[0].attrs.level === 3],
  ["bullet list", (chain) => chain.toggleBulletList(), "bulletList", undefined, "ul > li > p", (json) => json.content[0].type === "bulletList"],
  ["ordered list", (chain) => chain.toggleOrderedList(), "orderedList", undefined, "ol > li > p", (json) => json.content[0].type === "orderedList"],
  ["blockquote", (chain) => chain.toggleBlockquote(), "blockquote", undefined, "blockquote > p", (json) => json.content[0].type === "blockquote"],
  ["link", (chain) => chain.setLink({ href: "https://example.com" }), "link", undefined, 'a[href="https://example.com"]', (json) => json.content[0].content[0].marks.some((m) => m.attrs.href === "https://example.com")],
];

for (const [label, command, active, attrs, selector, check] of cases) {
  test(`actual ${label} command updates active state, JSON, DOM and persisted round trip`, (t) => {
    const editor = editorFor(t);
    assert.equal(command(editor.chain().focus()).run(), true);
    assert.equal(editor.isActive(active, attrs), true);
    assert.ok(check(editor.getJSON()));
    assert.equal(editor.view.dom.querySelector(selector)?.textContent, source);
    const payload = announcementInputSchema.parse({ title: "QA", content_format: "rich_text_v1", rich_content: canonicalEditorContent(editor.getJSON()), is_published: false });
    const stored = JSON.parse(JSON.stringify(payload));
    const reloaded = editorFor(t, content.editableRichContent(stored));
    assert.deepEqual(canonicalEditorContent(reloaded.getJSON()), stored.rich_content);
    assert.equal(stored.content, source);
    assert.equal(reloaded.view.dom.querySelector(selector)?.textContent, source);
  });
}

test("actual paragraph, divider, undo and redo commands change document and history", (t) => {
  const editor = editorFor(t);
  assert.equal(editor.can().undo(), false);
  editor.commands.setHeading({ level: 2 });
  assert.equal(editor.chain().focus().setParagraph().run(), true);
  assert.equal(editor.isActive("paragraph"), true);
  assert.equal(editor.getJSON().content[0].type, "paragraph");
  assert.equal(editor.view.dom.firstElementChild.tagName, "P");
  editor.commands.setTextSelection(source.length + 1);
  const before = editor.getJSON();
  assert.equal(editor.chain().focus().setHorizontalRule().run(), true);
  assert.ok(editor.getJSON().content.some((node) => node.type === "horizontalRule"));
  assert.ok(editor.view.dom.querySelector("hr"));
  const withDivider = editor.getJSON();
  assert.equal(editor.chain().focus().undo().run(), true);
  assert.ok(!editor.view.dom.querySelector("hr"));
  assert.deepEqual(editor.getJSON(), before);
  assert.equal(editor.chain().focus().redo().run(), true);
  assert.deepEqual(editor.getJSON(), withDivider);
  const stored = announcementInputSchema.parse({ title: "divider", content_format: "rich_text_v1", rich_content: canonicalEditorContent(withDivider), is_published: false });
  const reloaded = editorFor(t, content.editableRichContent(JSON.parse(JSON.stringify(stored))));
  assert.ok(reloaded.view.dom.querySelector("hr"));
  assert.equal(reloaded.view.dom.querySelector("p")?.textContent, source);
});

async function mountEditor(t, value = initial()) {
  let instance;
  let emitted;
  const Component = load("src/components/RichTextEditor.tsx", { "@tiptap/react": {
    ...tiptap,
    useEditor(options) { instance = tiptap.useEditor(options); return instance; },
  } }).RichTextEditor;
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => { root.render(React.createElement(Component, { id: "qa-content", label: "公告內容", initialContent: value, onChange: (next) => { emitted = next; } })); });
  await React.act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); });
  const button = (label) => host.querySelector(`button[aria-label="${label}"]`);
  return { host, get editor() { return instance; }, get emitted() { return emitted; }, button };
}

test("real React toolbar invokes commands and reflects heading, bold and undo states", async (t) => {
  const ui = await mountEditor(t);
  assert.equal(ui.button("復原").disabled, true);
  await React.act(async () => { ui.editor.commands.setTextSelection({ from: 1, to: source.length + 1 }); ui.button("粗體").click(); });
  assert.equal(ui.button("粗體").getAttribute("aria-pressed"), "true");
  assert.equal(ui.button("復原").disabled, false);
  assert.equal(ui.host.querySelector(".tiptap strong")?.textContent, source);
  assert.ok(ui.emitted.content[0].content[0].marks.some((mark) => mark.type === "bold"));
  const select = ui.host.querySelector('select[aria-label="段落層級"]');
  await React.act(async () => { select.value = "2"; select.dispatchEvent(new window.Event("change", { bubbles: true })); });
  assert.equal(select.value, "2");
  assert.equal(ui.host.querySelector(".tiptap h2")?.textContent, source);
});

test("toolbar exposes grouped controls and an explicit active visual hook", async (t) => {
  const ui = await mountEditor(t);
  assert.ok(ui.host.querySelector('[role="group"][aria-label="文字樣式"]'));
  assert.ok(ui.host.querySelector('[role="group"][aria-label="復原與重做"]'));
  assert.ok(ui.button("粗體").classList.contains("rich-editor-action"));
  assert.match(readFileSync("src/styles/globals.css", "utf8"), /\.rich-editor-action\[aria-pressed="true"\]/);
});

test("empty editor exposes a presentation-only placeholder without storing it", async (t) => {
  const ui = await mountEditor(t, content.richContentFromPlainText(""));
  assert.equal(ui.host.querySelector(".tiptap").getAttribute("data-placeholder"), "輸入公告內容…");
  assert.equal(ui.host.querySelector(".rich-editor").getAttribute("data-empty"), "true");
  assert.doesNotMatch(JSON.stringify(ui.editor.getJSON()), /輸入公告內容/);
});

test("opening link editor moves focus to URL input and applies only to the selection", async (t) => {
  const ui = await mountEditor(t);
  await React.act(async () => { ui.editor.commands.setTextSelection({ from: 1, to: 4 }); ui.button("新增或編輯連結").click(); });
  const input = ui.host.querySelector('input[type="url"]');
  assert.ok(document.activeElement === input, "URL field should receive focus");
  const enterUrl = async (value) => React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  const apply = () => [...ui.host.querySelectorAll("button")].find((button) => button.textContent === "套用連結");
  await enterUrl("javascript:alert(1)");
  await React.act(async () => { apply().click(); });
  assert.match(ui.host.querySelector('[role="alert"]').textContent, /http/);
  assert.equal(ui.host.querySelector(".tiptap a"), null);
  await enterUrl("https://example.com/first");
  await React.act(async () => { apply().click(); });
  assert.equal(ui.host.querySelector(".tiptap a")?.textContent, "無限制");
  assert.equal(ui.host.querySelector(".tiptap a")?.getAttribute("href"), "https://example.com/first");

  // Reopen with a cursor inside the mark: editing must update the whole link.
  await React.act(async () => { ui.editor.commands.setTextSelection(2); ui.button("新增或編輯連結").click(); });
  const editInput = ui.host.querySelector('input[type="url"]');
  assert.equal(editInput.value, "https://example.com/first");
  assert.equal(ui.button("新增或編輯連結").getAttribute("aria-pressed"), "true");
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(editInput, "https://example.com/edited");
    editInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  await React.act(async () => { apply().click(); });
  assert.equal(ui.host.querySelector(".tiptap a")?.textContent, "無限制");
  assert.equal(ui.host.querySelector(".tiptap a")?.getAttribute("href"), "https://example.com/edited");
  await React.act(async () => { ui.button("新增或編輯連結").click(); });
  await React.act(async () => { [...ui.host.querySelectorAll("button")].find((button) => button.textContent === "移除連結").click(); });
  assert.equal(ui.host.querySelector(".tiptap a"), null);
  assert.equal(ui.editor.getText(), source);
});

test("mouse toolbar activation preserves selection while keyboard click remains available", async (t) => {
  const ui = await mountEditor(t);
  const event = new window.MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 });
  ui.button("粗體").dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  await React.act(async () => { ui.editor.commands.setTextSelection({ from: 1, to: source.length + 1 }); ui.button("粗體").click(); });
  assert.equal(ui.editor.isActive("bold"), true);
});

test("legacy content can receive heading and bold without losing line breaks on save/reload", (t) => {
  const legacy = "無限制的虛式\n第二行\n\n第四行";
  const editor = editorFor(t, content.richContentFromPlainText(legacy));
  assert.equal(editor.chain().focus().toggleBold().setHeading({ level: 2 }).run(), true);
  const payload = announcementInputSchema.parse({ title: "legacy", content_format: "rich_text_v1", rich_content: canonicalEditorContent(editor.getJSON()), is_published: true });
  assert.equal(payload.content, legacy);
  const reloaded = editorFor(t, content.editableRichContent(JSON.parse(JSON.stringify(payload))));
  assert.equal(reloaded.view.dom.querySelector("h2 strong")?.textContent, source);
  assert.ok(reloaded.view.dom.querySelector("h2 br"));
  assert.deepEqual(canonicalEditorContent(reloaded.getJSON()), payload.rich_content);
});

test("bold at an empty selection affects subsequent typing, not existing text", (t) => {
  const editor = editorFor(t);
  editor.commands.setTextSelection(source.length + 1);
  const before = editor.getJSON();
  assert.equal(editor.chain().focus().toggleBold().run(), true);
  assert.equal(editor.isActive("bold"), true);
  assert.deepEqual(editor.getJSON(), before);
  editor.commands.insertContent("新文字");
  assert.equal(editor.view.dom.querySelector("strong")?.textContent, "新文字");
  assert.equal(editor.getJSON().content[0].content[0].marks, undefined);
});
