import { createPublicCacheRuntime } from "./helpers/next-public-cache.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "./helpers/load-app-module.mjs";

const content = load("src/libs/rich-content/content.ts");
const { RichTextRenderer } = load("src/components/RichTextRenderer.tsx");
const doc = (...nodes) => ({ type: "doc", content: nodes });
const paragraph = { type: "paragraph", content: [{ type: "text", text: "介紹" }] };
const render = (document) => renderToStaticMarkup(React.createElement(RichTextRenderer, { content: "fallback", content_format: "rich_text_v1", rich_content: document }));

test("H2/H3/H4 persist and render; entity-owned H1 remains forbidden", () => {
  for (const level of [2, 3, 4]) {
    const value = doc({ type: "heading", attrs: { level }, content: paragraph.content });
    assert.equal(content.richContentSchema.safeParse(value).success, true);
    assert.match(render(value), new RegExp(`<h${level}>介紹</h${level}>`));
  }
  assert.equal(content.richContentSchema.safeParse(doc({ type: "heading", attrs: { level: 1 }, content: paragraph.content })).success, false);
});

test("YouTube URLs normalize by exact provider host and valid ID", () => {
  const { normalizeMedia } = load("src/libs/rich-content/media.ts");
  const expected = { type: "videoEmbed", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ" } };
  assert.deepEqual(normalizeMedia("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share"), expected);
  assert.deepEqual(normalizeMedia("youtube", "https://youtu.be/dQw4w9WgXcQ?t=3"), expected);
  for (const url of ["https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ", "https://evilyoutube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=bad", "javascript:alert(1)", "https://user:password@youtube.com/watch?v=dQw4w9WgXcQ"])
    assert.throws(() => normalizeMedia("youtube", url));
});

test("media protocol/credential allowlist and strict node attributes reject executable payloads", () => {
  const { normalizeMedia } = load("src/libs/rich-content/media.ts");
  for (const type of ["video", "audio"]) {
    assert.equal(content.richContentSchema.safeParse(doc(normalizeMedia(type, `https://example.com/${type}.${type === "video" ? "mp4" : "mp3"}`))).success, true);
    for (const url of ["http://example.com/a", "data:text/html,test", "blob:https://example.com/a", "file:///a", "vbscript:1", "https://a:b@example.com/a", "https://example.com/a\n"])
      assert.throws(() => normalizeMedia(type, url));
  }
  for (const node of [{ type: "iframe", attrs: { src: "https://example.com" } }, { type: "videoEmbed", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ", onclick: "alert(1)" } }, { type: "audioEmbed", attrs: { src: "javascript:alert(1)" } }])
    assert.equal(content.richContentSchema.safeParse(doc(paragraph, node)).success, false);
});

test("renderer owns iframe HTML and native controls without autoplay", () => {
  const { normalizeMedia } = load("src/libs/rich-content/media.ts");
  const html = render(doc(normalizeMedia("youtube", "https://youtu.be/dQw4w9WgXcQ"), normalizeMedia("video", "https://example.com/movie.mp4"), normalizeMedia("audio", "https://example.com/audio.mp3")));
  assert.match(html, /https:\/\/www.youtube-nocookie.com\/embed\/dQw4w9WgXcQ/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /<video[^>]*controls=""/);
  assert.match(html, /<audio[^>]*controls=""/);
  assert.match(html, /preload="metadata"/);
  assert.doesNotMatch(html, /autoplay|dangerouslySetInnerHTML|onclick/i);
});

const game = { name: "桌遊", inventory_number: 1, category_id: "11111111-1111-4111-8111-111111111111", location_id: "22222222-2222-4222-8222-222222222222" };
const event = { name: "活動", start_time: "2026-09-14T00:00:00Z", end_time: "2026-09-14T02:00:00Z" };
for (const [domain, module, create, update, base] of [
  ["board games", "src/services/board-games/board-games.schema.ts", "createBoardGameSchema", "updateBoardGameSchema", game],
  ["events", "src/services/events/events.schema.ts", "createEventSchema", "updateEventSchema", event],
]) {
  test(`${domain}: rich create/update derive searchable companion; legacy and partial edits survive`, () => {
    const schemas = load(module);
    for (const key of [create, update]) {
      const data = schemas[key].parse({ ...base, description: "forged", description_format: "rich_text_v1", rich_description: doc(paragraph) });
      assert.equal(data.description, "介紹");
      assert.deepEqual(data.rich_description, doc(paragraph));
    }
    const legacy = schemas[create].parse({ ...base, description: "line 1\nline 2\n\nline 4" });
    assert.equal(legacy.description_format, "plain_text");
    assert.equal(legacy.rich_description, null);
    assert.equal(legacy.description, "line 1\nline 2\n\nline 4");
    const patch = schemas[update].parse({ name: "新名稱" });
    assert.equal(Object.hasOwn(patch, "description"), false);
    assert.equal(Object.hasOwn(patch, "rich_description"), false);
    assert.equal(schemas[create].safeParse({ ...base, description_format: "rich_text_v1", rich_description: doc({ type: "script" }) }).success, false);
    const cleared = schemas[update].parse({ description_format: "rich_text_v1", rich_description: doc({ type: "paragraph" }) });
    assert.equal(cleared.description, null);
    assert.equal(cleared.rich_description, null);
    assert.equal(cleared.description_format, "plain_text");
  });
}

test("full domain displays use shared SSR renderer; search remains plain text", () => {
  for (const path of ["src/app/(public)/board-games/[id]/page.tsx", "src/app/(admin)/admin/events/[id]/page.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /RichTextRenderer/);
    assert.doesNotMatch(source, /@tiptap|RichTextEditor/);
  }
  for (const path of ["src/repositories/board-games.repository.ts", "src/repositories/events.repository.ts"])
    assert.match(readFileSync(path, "utf8"), /buildIlikeSearch\(\["name", "description"\]/);
});

function formHarness(path, name, props, fail = false) {
  let cursor = 0;
  const states = [], calls = [], navigations = [];
  function EditorStub() {}
  const component = load(path, {
    react: { ...React, useMemo: (fn) => fn(), useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
      return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    } },
    "next/dynamic": { default: () => EditorStub },
    "next/navigation": { useRouter: () => ({ push: (href) => navigations.push(href), refresh: () => navigations.push("refresh") }) },
    "@/libs/api/client": { apiClient: async (...args) => { calls.push(args); if (fail) throw new Error("受控失敗"); } },
  })[name];
  const tree = () => { cursor = 0; return component(props); };
  function find(element, predicate) {
    if (!element || typeof element !== "object") return null;
    if (predicate(element)) return element;
    return React.Children.toArray(element.props?.children).map((child) => find(child, predicate)).find(Boolean);
  }
  return { tree, find, EditorStub, calls, navigations };
}

test("board-game create/edit bind rich documents, preserve failure state and list return context", async () => {
  for (const mode of ["create", "edit"]) {
    const initialValues = { ...game, inventory_number: "1", description: "第一行\n第二行", image: "", status: "available" };
    for (const fail of [false, true]) {
      const h = formHarness("src/components/(admin)/admin/board-games/BoardGameForm.tsx", "BoardGameForm", { mode, boardGameId: "game", initialValues, categories: [], locations: [], returnTo: "/admin/board-games?search=QA&page=2" }, fail);
      const editor = h.find(h.tree(), (e) => e.type === h.EditorStub);
      assert.equal(content.plainTextFromRichContent(editor.props.initialContent), initialValues.description);
      const document = doc({ type: "heading", attrs: { level: 4 }, content: paragraph.content });
      editor.props.onChange(document);
      await h.find(h.tree(), (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
      assert.equal(h.calls.length, 1);
      assert.equal(h.calls[0][1].method, mode === "create" ? "POST" : "PATCH");
      assert.deepEqual(h.calls[0][1].body.rich_description, document);
      assert.equal(h.calls[0][1].body.description, undefined);
      assert.deepEqual(h.navigations, fail ? [] : ["/admin/board-games?search=QA&page=2", "refresh"]);
      if (fail) {
        await h.find(h.tree(), (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
        assert.deepEqual(h.calls[1][1].body.rich_description, document);
      }
    }
  }
});

test("event create and edit emit rich descriptions; failed saves retain edits", async () => {
  for (const editing of [false, true]) {
    const existing = { id: "event", ...event, description: "舊說明\n保留換行", check_in_opens_at: null, check_in_closes_at: null };
    const h = formHarness(`src/components/(admin)/admin/events/${editing ? "EventRecords" : "EventActions"}.tsx`, editing ? "EventRecords" : "EventActions", { events: [existing] }, true);
    if (editing) h.find(h.tree(), (e) => typeof e.props.onEdit === "function").props.onEdit(existing);
    else h.find(h.tree(), (e) => e.props.children === "新增活動").props.onClick();
    let tree = h.tree();
    if (!editing) for (const [id, value] of [["event-name", "活動"], ["event-start-time", "2026-09-14T08:00"], ["event-end-time", "2026-09-14T10:00"]])
      h.find(tree, (e) => e.props.id === id).props.onChange({ target: { value } });
    const editor = h.find(tree, (e) => e.type === h.EditorStub);
    if (editing) assert.equal(content.plainTextFromRichContent(editor.props.initialContent), existing.description);
    editor.props.onChange(doc(paragraph));
    tree = h.tree();
    await h.find(tree, (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(h.calls[0][1].method, editing ? "PATCH" : "POST");
    assert.deepEqual(h.calls[0][1].body.rich_description, doc(paragraph));
    assert.deepEqual(h.navigations, []);
    await h.find(h.tree(), (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
    assert.deepEqual(h.calls[1][1].body.rich_description, doc(paragraph));
  }
});

test("unknown description versions are read safely and cannot be overwritten by domain forms", async () => {
  const { storedDescription } = load("src/libs/rich-content/description.ts");
  const value = { description: "保留 <script>alert(1)</script>", description_format: "future", rich_description: { version: 9 } };
  const html = renderToStaticMarkup(React.createElement(RichTextRenderer, storedDescription(value)));
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  const h = formHarness("src/components/(admin)/admin/board-games/BoardGameForm.tsx", "BoardGameForm", { mode: "edit", initialValues: { ...game, ...value, inventory_number: "1", image: "" }, categories: [], locations: [] });
  assert.equal(h.find(h.tree(), (e) => e.type === h.EditorStub).props.disabled, true);
  await h.find(h.tree(), (e) => e.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(h.calls.length, 0);
});

test("real services persist canonical rich descriptions and reject invalid content before writes", async () => {
  const writes = [];
  const mocks = {
    "@/libs/supabase/server": { supabase: {} },
    "next/cache": createPublicCacheRuntime().module,
    "@/repositories/board-games.repository": { boardGamesRepository: { existsByInventoryNumber: async () => false, findById: async () => ({ ...game, status: "available" }), create: async (data) => { writes.push(data); return data; }, updateById: async (_id, data) => { writes.push(data); return data; } } },
    "@/repositories/board-game-categories.repository": { boardGameCategoriesRepository: { findById: async () => ({}) } },
    "@/repositories/board-game-locations.repository": { boardGameLocationsRepository: { findById: async () => ({}) } },
    "@/repositories/events.repository": { eventsRepository: { findById: async () => ({ ...event, check_in_opens_at: null, check_in_closes_at: null }), create: async (data) => { writes.push(data); return data; }, updateById: async (_id, data) => { writes.push(data); return data; } } },
  };
  const games = load("src/services/board-games/board-games.service.ts", mocks).boardGamesService;
  const events = load("src/services/events/events.service.ts", mocks).eventsService;
  const rich = { description: "forged", description_format: "rich_text_v1", rich_description: doc(paragraph) };
  await games.createBoardGame({ ...game, ...rich });
  await games.updateBoardGame("id", rich);
  await events.createEvent({ ...event, ...rich });
  await events.updateEvent("id", rich);
  assert.equal(writes.length, 4);
  for (const data of writes) { assert.equal(data.description, "介紹"); assert.deepEqual(data.rich_description, doc(paragraph)); }
  await assert.rejects(() => games.createBoardGame({ ...game, ...rich, rich_description: doc({ type: "iframe" }) }));
  await assert.rejects(() => events.createEvent({ ...event, ...rich, rich_description: doc({ type: "iframe" }) }));
  assert.equal(writes.length, 4);
});
