import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "./helpers/load-app-module.mjs";
import { getSchema } from "@tiptap/react";

const model = () => load("src/libs/rich-content/content.ts");
const text = (value, marks) => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const paragraph = (...content) => ({ type: "paragraph", content });
const doc = (...content) => ({ type: "doc", content });
const render = (props) => renderToStaticMarkup(createElement(load("src/components/RichTextRenderer.tsx").RichTextRenderer, props));

test("legacy text conversion preserves lines, blank lines and literal HTML/Markdown", () => {
  for (const value of ["一段", "line 1\nline 2\n\nline 4", "<script>alert(1)</script>\n**不是粗體**", "\n前後\n\n", "https://example.com"]) {
    assert.equal(model().plainTextFromRichContent(model().richContentFromPlainText(value)), value);
    assert.ok(render({ content: value, content_format: "plain_text" }).includes(value.replaceAll("<", "&lt;").replaceAll(">", "&gt;")));
  }
});

test("supported rich document validates and SSR renders semantic features", () => {
  const rich = doc({ type: "heading", attrs: { level: 2 }, content: [text("大標")] }, { type: "heading", attrs: { level: 3 }, content: [text("小標")] }, paragraph(text("粗", [{ type: "bold" }]), text("斜", [{ type: "italic" }]), text("連結", [{ type: "link", attrs: { href: "https://example.com" } }])), { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("項目"))] }] }, { type: "orderedList", attrs: { start: 2 }, content: [{ type: "listItem", content: [paragraph(text("第二項"))] }] }, { type: "blockquote", content: [paragraph(text("引言"))] }, { type: "horizontalRule" });
  assert.equal(model().richContentSchema.safeParse(rich).success, true);
  const html = render({ content: "fallback", content_format: "rich_text_v1", rich_content: rich });
  for (const tag of ["h2", "h3", "strong", "em", "ul", "ol", "blockquote", "hr"]) assert.match(html, new RegExp(`<${tag}[ >/]`));
  assert.match(html, /href="https:\/\/example.com"/);
  assert.doesNotMatch(html, /<h1|target=/);
});

test("mutation validation rejects unsafe links, unknown nodes/marks/attributes and H1", () => {
  const bad = ["javascript:alert(1)", "data:text/html,hi", "vbscript:x", "//evil.example", "java\nscript:x", " https://example.com", "https://user:password@example.com"];
  for (const href of bad) assert.equal(model().richContentSchema.safeParse(doc(paragraph(text("x", [{ type: "link", attrs: { href } }])))).success, false, href);
  for (const type of ["script", "iframe", "image", "style", "html"]) assert.equal(model().richContentSchema.safeParse(doc({ type })).success, false);
  for (const mark of [{ type: "unknown" }, { type: "bold", attrs: { onclick: "alert(1)" } }]) assert.equal(model().richContentSchema.safeParse(doc(paragraph(text("x", [mark])))).success, false);
  assert.equal(model().richContentSchema.safeParse(doc({ type: "heading", attrs: { level: 1 }, content: [text("x")] })).success, false);
  assert.equal(model().richContentSchema.safeParse(doc({ ...paragraph(text("x")), onclick: "alert(1)" })).success, false);
});

test("empty, oversized and deeply nested documents fail bounded required validation", () => {
  for (const rich of [doc(paragraph()), doc(paragraph(text("  \n\u200b"))), doc({ type: "horizontalRule" }), doc(paragraph(text("x".repeat(20001))))]) assert.equal(model().richContentSchema.safeParse(rich).success, false);
  let nested = paragraph(text("deep"));
  for (let i = 0; i < 30; i++) nested = { type: "blockquote", content: [nested] };
  assert.equal(model().richContentSchema.safeParse(doc(nested)).success, false);
});

test("unknown version and malformed rich content safely fall back to escaped plain text", () => {
  for (const content_format of ["rich_text_v2", "rich_text_v1"]) {
    const html = render({ content: "<img onerror=alert(1)>", content_format, rich_content: { type: "script" } });
    assert.match(html, /&lt;img/);
    assert.doesNotMatch(html, /<img|<script/);
  }
});

test("server derives searchable companion text and preserves publication semantics on legacy upgrade", async () => {
  let stored;
  const published = "2026-01-01T00:00:00Z";
  const service = load("src/services/announcements/announcements.service.ts", {
    "@/repositories/announcements.repository": { announcementsRepository: {
      create: async (data) => (stored = data), findById: async () => ({ is_published: true, published_at: published }), updateById: async (_, data) => (stored = data),
    } },
  }).announcementsService;
  const rich_content = doc(paragraph(text("可搜尋社課")));
  await service.createForAdmin("author", { title: "標題", content: "偽造", content_format: "rich_text_v1", rich_content, is_published: false });
  assert.equal(stored.content, "可搜尋社課");
  assert.equal(stored.author_id, "author");
  assert.equal(stored.published_at, null);
  await service.updateForAdmin(1, { title: "標題", content_format: "rich_text_v1", rich_content, is_published: true });
  assert.equal(stored.published_at, published);
  await service.createForAdmin("author", { title: "舊 API", content: "純文字", is_published: false });
  assert.equal(stored.content, "純文字");
  assert.equal(stored.content_format, "plain_text");
  assert.equal(stored.rich_content, null);
});

test("literal script/image text is escaped even inside a valid rich document", () => {
  const html = render({ content: "", content_format: "rich_text_v1", rich_content: doc(paragraph(text('<script>alert(1)</script><img onerror="x">'))) });
  assert.doesNotMatch(html, /<script|<img|<iframe/);
  assert.match(html, /&lt;script&gt;/);
});

test("byte budget and node budget reject excessive formatting even under the plain text limit", () => {
  assert.equal(model().richContentSchema.safeParse(doc(...Array.from({ length: 4001 }, () => paragraph(text("x"))))).success, false);
  const link = [{ type: "link", attrs: { href: "https://example.com/" + "a".repeat(1900) } }];
  assert.equal(model().richContentSchema.safeParse(doc(paragraph(...Array.from({ length: 70 }, () => text("x", link))))).success, false);
  const cycle = doc(); cycle.content.push(cycle);
  assert.equal(model().richContentSchema.safeParse(cycle).success, false);
});

test("editor adapter drops HTML attributes and preserves canonical list/link semantics", () => {
  const { canonicalEditorContent } = load("src/libs/rich-content/editor-document.ts");
  const result = canonicalEditorContent(doc({ type: "orderedList", attrs: { start: 3, type: "A", style: "color:red" }, content: [{ type: "listItem", content: [paragraph(text("link", [{ type: "link", attrs: { href: "https://example.com", target: "_blank", rel: "opener", class: "x", title: "x", onclick: "alert(1)" } }]))] }] }));
  assert.equal(model().richContentSchema.safeParse(result).success, true);
  assert.doesNotMatch(JSON.stringify(result), /onclick|opener|style|_blank/);
  assert.equal(result.content[0].attrs.start, 3);
});

test("list/home excerpts and SEO use plain extraction; search and publication boundaries remain", async () => {
  const rich = { content: "old companion", content_format: "rich_text_v1", rich_content: doc(paragraph(text("社課", [{ type: "bold" }]), text("\n報名"))) };
  assert.equal(model().plainTextFromStoredContent(rich), "社課\n報名");
  const read = (path) => readFileSync(path, "utf8");
  const row = load("src/components/(public)/announcements/AnnouncementRow.tsx", { "next/link": { default: ({ children, ...props }) => createElement("a", props, children) } }).AnnouncementRow;
  const html = renderToStaticMarkup(createElement(row, { announcement: { ...rich, id: 1, title: "標題", created_at: "2026-09-13" }, headingLevel: 2 }));
  assert.match(html, /社課/); assert.doesNotMatch(html, /old companion|rich_text_v1|<strong/);
  assert.match(read("src/components/(public)/home/LatestAnnouncementsSection.tsx"), /AnnouncementRow/);
  assert.match(read("src/app/(public)/announcements/[id]/page.tsx"), /createMetadataDescription\(plainTextFromStoredContent\(announcement\)\)/);
  const repository = read("src/repositories/announcements.repository.ts");
  assert.match(repository, /content\.ilike/);
  assert.match(repository, /eq\("is_published", true\)/);
  for (const path of ["src/app/api/admin/announcements/route.ts", "src/app/api/admin/announcements/[id]/route.ts"]) assert.match(read(path), /authorizeAdminRequest/);
});

test("public renderer has no editor runtime, raw HTML sink or client boundary", () => {
  for (const path of ["src/components/RichTextRenderer.tsx", "src/libs/rich-content/content.ts", "src/app/(public)/announcements/[id]/page.tsx"]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /@tiptap|dangerouslySetInnerHTML|["']use client["']/);
  }
  const editor = readFileSync("src/components/RichTextEditor.tsx", "utf8");
  assert.match(editor, /levels: \[2, 3, 4\]/);
  assert.match(editor, /immediatelyRender: false/);
  assert.match(editor, /aria-pressed/);
  assert.match(editor, /isAllowedUri: isSafeRichLink/);
});

function formHarness(announcement, fail = false) {
  let cursor = 0;
  const states = [];
  const calls = [];
  const navigations = [];
  function EditorStub() {}
  const component = load("src/components/(admin)/admin/announcements/AnnouncementEditor.tsx", {
    react: { ...React, useState(initial) {
      const i = cursor++;
      if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial;
      return [states[i], (value) => { states[i] = typeof value === "function" ? value(states[i]) : value; }];
    } },
    "next/dynamic": { default: () => EditorStub },
    "next/navigation": { useRouter: () => ({ push: (href) => navigations.push(href), refresh() {} }) },
    "@/libs/api/client": { apiClient: async (...args) => { calls.push(args); if (fail) throw new Error("受控失敗"); } },
  }).AnnouncementEditor;
  function tree() { cursor = 0; return component({ announcement, returnTo: "/admin/announcements?search=club&page=2" }); }
  function find(element, predicate) {
    if (!element || typeof element !== "object") return null;
    if (predicate(element)) return element;
    return React.Children.toArray(element.props?.children).map((child) => find(child, predicate)).find(Boolean);
  }
  return { tree, find, EditorStub, calls, navigations };
}

test("create submits canonical rich document and returns to applied list context", async () => {
  const h = formHarness();
  let tree = h.tree();
  h.find(tree, (e) => e.props.id === "announcement-title").props.onChange({ target: { value: "社課" } });
  const rich = doc(paragraph(text("報名內容")));
  h.find(tree, (e) => e.type === h.EditorStub).props.onChange(rich);
  tree = h.tree();
  h.find(tree, (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(h.calls[0][1].method, "POST");
  assert.deepEqual(h.calls[0][1].body.rich_content, rich);
  assert.equal(h.calls[0][1].body.content_format, "rich_text_v1");
  assert.equal(h.calls[0][1].body.content, undefined);
  assert.deepEqual(h.navigations, ["/admin/announcements?search=club&page=2"]);
});

test("legacy and rich edit load correctly; failed mutation preserves content and route", async () => {
  for (const announcement of [
    { id: 1, title: "舊公告", content: "第一行\n第二行\n\n第四行", is_published: true },
    { id: 2, title: "新公告", content: "內容", content_format: "rich_text_v1", rich_content: doc(paragraph(text("格式", [{ type: "bold" }]))), is_published: true },
  ]) {
    const h = formHarness(announcement, true);
    const tree = h.tree();
    const initial = h.find(tree, (e) => e.type === h.EditorStub).props.initialContent;
    assert.deepEqual(initial, model().editableRichContent(announcement));
    h.find(tree, (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
    await new Promise(setImmediate);
    assert.equal(h.calls[0][1].method, "PATCH");
    assert.deepEqual(h.calls[0][1].body.rich_content, initial);
    assert.equal(h.calls[0][1].body.is_published, true);
    assert.deepEqual(h.navigations, []);
    assert.deepEqual(h.find(h.tree(), (e) => e.type === h.EditorStub).props.initialContent, initial);
    assert.ok(h.find(h.tree(), (e) => e.props.error === "受控失敗"));
  }
});

test("empty editor cannot submit and cancel still preserves source list", async () => {
  const h = formHarness();
  h.find(h.tree(), (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(h.calls.length, 0);
  assert.ok(h.find(h.tree(), (e) => e.props.error === "請輸入內容"));
  h.find(h.tree(), (e) => e.props.children === "取消").props.onClick();
  assert.deepEqual(h.navigations, ["/admin/announcements?search=club&page=2"]);
});

test("actual editor schema round-trips canonical structure without adding unsupported features", () => {
  const { createRichTextExtensions } = load("src/components/RichTextEditor.tsx");
  const schema = getSchema(createRichTextExtensions());
  const { canonicalEditorContent } = load("src/libs/rich-content/editor-document.ts");
  const rich = doc({ type: "heading", attrs: { level: 2 }, content: [text("社課")] }, paragraph(text("報名", [{ type: "link", attrs: { href: "https://example.com" } }, { type: "bold" }])), { type: "orderedList", attrs: { start: 2 }, content: [{ type: "listItem", content: [paragraph(text("遊戲"))] }] });
  const parsed = schema.nodeFromJSON(rich);
  parsed.check();
  const canonical = model().richContentSchema.parse(canonicalEditorContent(parsed.toJSON()));
  assert.deepEqual(canonical, rich);
  for (const disabled of ["image", "iframe", "table", "codeBlock"]) assert.equal(schema.nodes[disabled], undefined);
  assert.deepEqual(Object.keys(schema.marks).sort(), ["bold", "italic", "link"]);
  assert.throws(() => schema.nodeFromJSON(doc({ type: "script" })));
});

test("unknown future content cannot be overwritten through the editor", async () => {
  const h = formHarness({ id: 1, title: "future", content: "保留原文", content_format: "rich_text_v2", rich_content: { future: true }, is_published: false });
  assert.equal(h.find(h.tree(), (e) => e.type === h.EditorStub).props.disabled, true);
  h.find(h.tree(), (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(h.calls.length, 0);
});

test("real announcement API maps unsafe rich mutation to expected 400 without repository write", async () => {
  let writes = 0;
  let incidents = 0;
  const { POST } = load("src/app/api/admin/announcements/route.ts", {
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async () => ({ user: { id: "author" } }) },
    "@/libs/api/server-response": { unexpectedErrorResponse: () => { incidents++; return new Response(null, { status: 500 }); } },
    "@/repositories/announcements.repository": { announcementsRepository: { create: async () => { writes++; } } },
  });
  const response = await POST(new Request("http://localhost/api/admin/announcements", { method: "POST", body: JSON.stringify({ title: "bad", content_format: "rich_text_v1", rich_content: doc(paragraph(text("link", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]))), is_published: false }) }));
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.errorId, undefined);
  assert.equal(writes, 0);
  assert.equal(incidents, 0);
});

test("real announcement API preserves authorization and returns canonical rich creation", async () => {
  let authorized = false;
  let stored;
  const { POST } = load("src/app/api/admin/announcements/route.ts", {
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async () => authorized ? { user: { id: "server-author" } } : { response: new Response(null, { status: 403 }) } },
    "@/libs/api/server-response": { unexpectedErrorResponse: () => new Response(null, { status: 500 }) },
    "@/repositories/announcements.repository": { announcementsRepository: { create: async (payload) => (stored = payload) } },
  });
  const request = () => new Request("http://localhost/api/admin/announcements", { method: "POST", body: JSON.stringify({ title: "safe", content: "forged companion", author_id: "forged-author", content_format: "rich_text_v1", rich_content: doc(paragraph(text("公告"))), is_published: false }) });
  assert.equal((await POST(request())).status, 403);
  assert.equal(stored, undefined);
  authorized = true;
  const response = await POST(request());
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.content, "公告");
  assert.equal(stored.author_id, "server-author");
});
