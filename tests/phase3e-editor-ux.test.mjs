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
// jsdom models dialog events but not the browser top layer.
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { if (this.open) { this.open = false; this.dispatchEvent(new window.Event("close")); } };
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

test("media toolbar inserts, inspects, replaces and removes a selected canonical atom", async (t) => {
  const ui = await mountEditor(t);
  const byText = (text) => [...ui.host.querySelectorAll("button")].find((button) => button.textContent === text);
  const enter = async (value) => React.act(async () => {
    const input = ui.host.querySelector('#qa-content-media-url');
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  await React.act(async () => { ui.editor.commands.setTextSelection(source.length + 1); ui.button("新增或編輯媒體").click(); });
  assert.ok(document.activeElement === ui.host.querySelector('#qa-content-media-url'));
  await enter("https://youtube.evil.test/watch?v=dQw4w9WgXcQ");
  await React.act(async () => byText("插入媒體").click());
  assert.ok(ui.host.querySelector('[role="alert"]'));
  await enter("https://youtu.be/dQw4w9WgXcQ");
  await React.act(async () => byText("插入媒體").click());
  assert.ok(ui.host.querySelector('.tiptap [data-media="videoEmbed"]'));
  assert.equal(ui.host.querySelector('.tiptap iframe'), null, "editor preview makes no third-party request");
  let position;
  ui.editor.state.doc.descendants((node, pos) => { if (node.type.name === "videoEmbed") position = pos; });
  await React.act(async () => { ui.editor.commands.setNodeSelection(position); });
  assert.equal(ui.button("新增或編輯媒體").getAttribute("aria-pressed"), "true");
  await React.act(async () => ui.button("新增或編輯媒體").click());
  assert.equal(ui.host.querySelector('#qa-content-media-url').value, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await enter("https://youtu.be/abcdefghijk");
  await React.act(async () => byText("更新媒體").click());
  const stored = announcementInputSchema.parse({ title: "media", is_published: false, content_format: "rich_text_v1", rich_content: canonicalEditorContent(ui.editor.getJSON()) });
  const reloaded = editorFor(t, JSON.parse(JSON.stringify(stored.rich_content)));
  assert.deepEqual(canonicalEditorContent(reloaded.getJSON()), stored.rich_content);
  assert.equal(stored.rich_content.content.filter((n) => n.type === "videoEmbed").length, 1);
  assert.equal(stored.rich_content.content.find((n) => n.type === "videoEmbed").attrs.videoId, "abcdefghijk");
  await React.act(async () => ui.button("移除媒體").click());
  assert.equal(ui.host.querySelector('.tiptap [data-media]'), null);
  assert.equal(ui.editor.getText(), source);
});

test("direct video/audio and H4 round-trip through actual editor and server; pasted iframes do not", (t) => {
  const { normalizeMedia } = load("src/libs/rich-content/media.ts");
  const editor = editorFor(t);
  assert.equal(editor.chain().focus().setHeading({ level: 4 }).run(), true);
  editor.commands.setTextSelection(source.length + 1);
  for (const kind of ["video", "audio"]) assert.equal(editor.commands.insertContent(normalizeMedia(kind, `https://example.com/${kind}.${kind === "video" ? "mp4" : "mp3"}`)), true);
  const payload = announcementInputSchema.parse({ title: "media", is_published: false, content_format: "rich_text_v1", rich_content: canonicalEditorContent(editor.getJSON()) });
  const restored = editorFor(t, payload.rich_content);
  assert.deepEqual(canonicalEditorContent(restored.getJSON()), payload.rich_content);
  assert.ok(restored.view.dom.querySelector("h4"));
  restored.commands.insertContent('<iframe src="https://evil.test"></iframe><script>alert(1)</script>');
  assert.equal(restored.view.dom.querySelector("iframe,script"), null);
});

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
  ["H4", (chain) => chain.setHeading({ level: 4 }), "heading", { level: 4 }, "h4", (json) => json.content[0].attrs.level === 4],
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

async function mountEditor(t, value = initial(), nested = false) {
  let outerClosed = 0;
  const { Modal } = load("src/components/Modal.tsx");
  let instance;
  let emitted;
  const Component = load("src/components/RichTextEditor.tsx", { "@tiptap/react": {
    ...tiptap,
    useEditor(options) { instance = tiptap.useEditor(options); return instance; },
  } }).RichTextEditor;
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => { const element = React.createElement(Component, { id: "qa-content", label: "公告內容", initialContent: value, onChange: (next) => { emitted = next; } }); root.render(nested ? React.createElement(Modal, { open: true, title: "活動編輯", onClose: () => { outerClosed++; } }, element) : element); });
  await React.act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  t.after(async () => { await React.act(async () => root.unmount()); host.remove(); });
  const button = (label) => host.querySelector(`button[aria-label="${label}"]`);
  return { host, get outerClosed() { return outerClosed; }, get editor() { return instance; }, get emitted() { return emitted; }, button };
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
  const apply = () => [...ui.host.querySelectorAll("button")].find((button) => ["加入連結", "儲存"].includes(button.textContent));
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
  await React.act(async () => { ui.editor.commands.setTextSelection(2); ui.button("新增或編輯連結").click(); });
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

 test("closing a nested media dialog does not close its parent form", async (t) => {
 const { Modal } = load("src/components/Modal.tsx");
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host);
 let outerClosed=0;
 await React.act(async()=>root.render(React.createElement(Modal,{open:true,title:"event",onClose:()=>outerClosed++},React.createElement(Modal,{open:true,title:"media",onClose:()=>{}},"media"))));
 t.after(async()=>{await React.act(async()=>root.unmount());host.remove();});
 await React.act(async()=>host.querySelectorAll("dialog")[1].dispatchEvent(new window.Event("close")));
 assert.equal(outerClosed,0);
 });

test("Bilibili iframe inserts through auto dialog and contextual edit preserves canonical data", async(t)=>{
 const ui=await mountEditor(t);
 await React.act(async()=>ui.button("新增或編輯媒體").click());
 const input=ui.host.querySelector("textarea");
 await React.act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,"value").set.call(input,'<iframe src="//player.bilibili.com/player.html?bvid=BV1JYED6tEff" allow="camera"></iframe>');input.dispatchEvent(new window.Event("input",{bubbles:true}));});
 await React.act(async()=>[...ui.host.querySelectorAll("button")].find(b=>b.textContent==="插入媒體").click());
 assert.equal(ui.host.querySelector("dialog").open,false);
 assert.equal(ui.host.querySelector(".tiptap iframe"),null);
 const stored=announcementInputSchema.parse({title:"Bilibili",is_published:false,content_format:"rich_text_v1",rich_content:canonicalEditorContent(ui.editor.getJSON())});
 assert.equal(stored.rich_content.content.find(n=>n.type==="videoEmbed").attrs.provider,"bilibili");
 assert.doesNotMatch(JSON.stringify(stored),/iframe|camera/);
 const restored=editorFor(t,stored.rich_content);assert.deepEqual(canonicalEditorContent(restored.getJSON()),stored.rich_content);
 await React.act(async()=>ui.button("編輯媒體").click());
 assert.equal(ui.host.querySelector("textarea").value,"https://www.bilibili.com/video/BV1JYED6tEff/");
 assert.equal(ui.host.querySelector("dialog").open,true);
});

test("link modal preserves original selection and closing does not dismiss event form", async(t)=>{
 const ui=await mountEditor(t,initial(),true);
 await React.act(async()=>{ui.editor.commands.setTextSelection({from:1,to:4});ui.button("新增或編輯連結").click();});
 const input=ui.host.querySelector('input[type="url"]');const dialog=input.closest('dialog');assert.ok(dialog?.open);assert.notEqual(dialog,ui.host.querySelector('dialog'));
 await React.act(async()=>{ui.editor.commands.setTextSelection(source.length+1);Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set.call(input,'https://example.com');input.dispatchEvent(new window.Event('input',{bubbles:true}));});
 await React.act(async()=>[...dialog.querySelectorAll('button')].find(b=>b.textContent==='加入連結').click());
 assert.equal(ui.host.querySelector('.tiptap a')?.textContent,'無限制');assert.equal(dialog.open,false);assert.equal(ui.outerClosed,0);
 const before=ui.editor.getJSON();await React.act(async()=>{ui.editor.commands.setTextSelection(2);ui.button('新增或編輯連結').click();});await React.act(async()=>[...dialog.querySelectorAll('button')].find(b=>b.textContent==='取消').click());assert.deepEqual(ui.editor.getJSON(),before);assert.equal(ui.outerClosed,0);
});

async function fillLink(ui,text,url) {
 for(const [selector,value] of [['input[id$="-link-text"]',text],['input[type="url"]',url]]) {
  await React.act(async()=>{const input=ui.host.querySelector(selector);assert.ok(input);Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set.call(input,value);input.dispatchEvent(new window.Event("input",{bubbles:true}));});
 }
}
async function submitLink(ui,label="加入連結") {
 await React.act(async()=>{[...ui.host.querySelectorAll("button")].find(b=>b.textContent===label).click();await new Promise(r=>setTimeout(r,30));});
}
test("empty cursor inserts complete link, leaves cursor after it and typing unlinked",async(t)=>{
 const ui=await mountEditor(t);const position=4;
 await React.act(async()=>{ui.editor.commands.setTextSelection(position);ui.button("新增或編輯連結").click();});
 assert.equal(document.activeElement,ui.host.querySelector('input[id$="-link-text"]'));
 assert.doesNotMatch(ui.host.textContent,/請先選取要加入連結的文字/);
 await fillLink(ui,"活動公告","https://example.com");await submitLink(ui);
 assert.equal(ui.editor.getText(),source.slice(0,3)+"活動公告"+source.slice(3));
 assert.equal(ui.editor.state.selection.from,position+4);
 assert.equal(ui.host.querySelector(".tiptap a").textContent,"活動公告");
 await React.act(async()=>ui.editor.view.dispatch(ui.editor.state.tr.insertText("後續")));
 assert.equal(ui.host.querySelector(".tiptap a").textContent,"活動公告");
});
test("link insertion is one undoable transaction",async(t)=>{
 const ui=await mountEditor(t);const before=ui.editor.getJSON();
 await React.act(async()=>{ui.editor.commands.setTextSelection(2);ui.button("新增或編輯連結").click();});
 await fillLink(ui,"公告","https://example.com");await submitLink(ui);
 await React.act(async()=>ui.editor.commands.undo());assert.deepEqual(ui.editor.getJSON(),before);
});
test("selection text can be replaced and existing full link renamed without changing neighbors",async(t)=>{
 const ui=await mountEditor(t);
 await React.act(async()=>{ui.editor.commands.setTextSelection({from:1,to:4});ui.editor.commands.toggleBold();ui.button("新增或編輯連結").click();});
 assert.equal(ui.host.querySelector('input[id$="-link-text"]').value,"無限制");
 await fillLink(ui,"官網","https://example.com");await submitLink(ui);
 assert.equal(ui.editor.getText(),"官網"+source.slice(3));assert.ok(ui.host.querySelector(".tiptap a strong, .tiptap strong a"));
 await React.act(async()=>{ui.editor.commands.setTextSelection(2);ui.button("新增或編輯連結").click();});
 assert.equal(ui.host.querySelector('input[id$="-link-text"]').value,"官網");
 await fillLink(ui,"社團官網","https://example.com/new");await submitLink(ui,"儲存");
 assert.equal(ui.editor.getText(),"社團官網"+source.slice(3));
 assert.equal(ui.host.querySelector(".tiptap a").getAttribute("href"),"https://example.com/new");
});

test("empty display text is field validation and Escape cancels only nested link modal",async(t)=>{
 const ui=await mountEditor(t,initial(),true);const before=ui.editor.getJSON();
 await React.act(async()=>{ui.editor.commands.setTextSelection(2);ui.button("新增或編輯連結").click();});
 await fillLink(ui,"   ","https://example.com");await submitLink(ui);
 assert.match(ui.host.querySelector('[role="alert"]').textContent,/顯示文字/);assert.deepEqual(ui.editor.getJSON(),before);
 const input=ui.host.querySelector('input[id$="-link-text"]');const dialog=input.closest("dialog");
 await React.act(async()=>input.dispatchEvent(new window.KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true})));
 assert.equal(dialog.open,false);assert.equal(ui.outerClosed,0);assert.deepEqual(ui.editor.getJSON(),before);
});
test("Enter applies the link without bubbling a parent form submit",async(t)=>{
 const ui=await mountEditor(t);let submitted=0;
 ui.host.addEventListener("submit",()=>submitted++);
 await React.act(async()=>{ui.editor.commands.setTextSelection(2);ui.button("新增或編輯連結").click();});
 await fillLink(ui,"公告","https://example.com");
 const event=new window.KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true});
 await React.act(async()=>ui.host.querySelector('input[type="url"]').dispatchEvent(event));
 assert.equal(event.defaultPrevented,true);assert.equal(submitted,0);assert.equal(ui.host.querySelector(".tiptap a").textContent,"公告");
});
