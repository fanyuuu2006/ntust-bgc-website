import assert from "node:assert/strict";
import { File } from "node:buffer";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSchema } from "@tiptap/react";
import { load } from "./helpers/load-app-module.mjs";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project-ref.supabase.co";
process.env.SUPABASE_URL = "https://project-ref.supabase.co";

const imageModel = load("src/libs/rich-content/image.ts");
const contentModel = () => load("src/libs/rich-content/content.ts");
const UUID = "123e4567-e89b-42d3-a456-426614174000";
const path = `uploads/2026/09/${UUID}.webp`;
const src = imageModel.buildRichContentImagePublicUrl(path);
const image = (attrs = {}) => ({
  type: "image",
  attrs: { src, alt: "社員一起遊玩桌遊", caption: "九月新生社課", ...attrs },
});
const doc = (...content) => ({ type: "doc", content });

test("canonical image URL and object path are project/bucket constrained", () => {
  assert.equal(imageModel.isRichContentImageObjectPath(path), true);
  assert.equal(imageModel.isCanonicalRichContentImageUrl(src), true);
  for (const value of [
    src.replace("project-ref", "other-project"),
    src.replace("rich-content-images", "other-bucket"),
    src.replace("uploads/", "../"),
    src + "?token=x",
    "javascript:alert(1)",
  ]) assert.equal(imageModel.isCanonicalRichContentImageUrl(value), false, value);
  assert.equal(
    imageModel.createRichContentImageObjectPath("png", new Date("2026-01-02T00:00:00Z"), UUID),
    `uploads/2026/01/${UUID}.png`,
  );
});

test("server and public Supabase origins share strict normalization", () => {
  assert.equal(imageModel.normalizeSupabaseOrigin("https://project-ref.supabase.co"), "https://project-ref.supabase.co");
  assert.equal(imageModel.normalizeSupabaseOrigin("http://project-ref.supabase.co"), null);
  assert.equal(imageModel.normalizeSupabaseOrigin("not-a-url"), null);
  assert.equal(imageModel.richContentImageOriginsMatch(
    "https://project-ref.supabase.co",
    "https://project-ref.supabase.co",
  ), true);
  assert.equal(imageModel.richContentImageOriginsMatch(
    "https://project-ref.supabase.co",
    "https://other.supabase.co",
  ), false);
  assert.equal(imageModel.richContentImageOriginsMatch(
    "https://project-ref.supabase.co",
    undefined,
  ), false);
});

test("image schema normalizes alt/caption and rejects unknown or oversized attrs", () => {
  const model = contentModel();
  const parsed = model.richDocumentSchema.parse(doc(image({ alt: "  說明  ", caption: "  圖說  " })));
  assert.deepEqual(parsed.content[0].attrs, { src, alt: "說明", caption: "圖說" });
  assert.equal(model.richDocumentSchema.parse(doc(image({ alt: "", caption: "   " }))).content[0].attrs.caption, null);
  for (const node of [
    { ...image(), onclick: "x" },
    image({ width: 100 }),
    image({ alt: " ", caption: null }),
    image({ alt: "字".repeat(301), caption: null }),
    image({ caption: "字".repeat(501) }),
    image({ src: "https://example.com/a.webp" }),
  ]) assert.equal(model.richDocumentSchema.safeParse(doc(node)).success, false);
});

test("plain companion prefers caption, falls back to alt, and ignores decorative image", () => {
  const model = contentModel();
  assert.equal(model.plainTextFromRichContent(doc(image())), "九月新生社課");
  assert.equal(model.plainTextFromRichContent(doc(image({ caption: null }))), "社員一起遊玩桌遊");
  const decorative = doc(image({ alt: "", caption: null }));
  assert.equal(model.plainTextFromRichContent(decorative), "");
  assert.equal(model.richContentSchema.safeParse(decorative).success, false);
  assert.equal(model.richContentSchema.safeParse(doc(image({ alt: "資訊圖片", caption: null }))).success, true);
});

test("Tiptap projection preserves only canonical image attrs", () => {
  const { canonicalEditorContent } = load("src/libs/rich-content/editor-document.ts");
  const projected = canonicalEditorContent(doc(image({ caption: " 圖說 ", width: 99, class: "x" })));
  assert.deepEqual(projected, doc(image({ caption: "圖說" })));
  assert.equal(contentModel().richDocumentSchema.safeParse(projected).success, true);
});

test("actual Tiptap schema serializes the canonical image atom", () => {
  const { createRichTextExtensions } = load("src/components/RichTextEditor.tsx");
  const schema = getSchema(createRichTextExtensions());
  const value = doc(image());
  const parsed = schema.nodeFromJSON(value);
  parsed.check();
  const projected = load("src/libs/rich-content/editor-document.ts")
    .canonicalEditorContent(parsed.toJSON());
  assert.deepEqual(contentModel().richDocumentSchema.parse(projected), value);
  assert.equal(schema.nodes.image.isAtom, true);
});

test("SSR renderer emits safe figure semantics and decorative alt", () => {
  const { RichTextRenderer } = load("src/components/RichTextRenderer.tsx");
  const html = renderToStaticMarkup(React.createElement(RichTextRenderer, {
    content: "fallback",
    content_format: "rich_text_v1",
    rich_content: doc(image({ alt: '<script>"', caption: "<b>圖說</b>" })),
  }));
  assert.match(html, /<figure/);
  assert.match(html, /<img[^>]+loading="lazy"[^>]+decoding="async"/);
  assert.match(html, /alt="&lt;script&gt;&quot;"/);
  assert.match(html, /<figcaption>&lt;b&gt;圖說&lt;\/b&gt;<\/figcaption>/);
  assert.doesNotMatch(html, /<script>|<b>圖說/);

  const decorative = renderToStaticMarkup(React.createElement(RichTextRenderer, {
    content: "fallback", content_format: "rich_text_v1",
    rich_content: doc({ type: "paragraph", content: [{ type: "text", text: "前文" }] }, image({ alt: "", caption: null })),
  }));
  assert.match(decorative, /alt=""/);
  assert.doesNotMatch(decorative, /figcaption/);
});

const signatures = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};

function serviceHarness() {
  const uploads = [];
  const serviceModule = load("src/services/rich-content-images/rich-content-images.service.ts", {
    "@/repositories/rich-content-images.repository": {
      richContentImagesRepository: {
        upload: async (...args) => uploads.push(args),
      },
    },
  });
  return { ...serviceModule, uploads };
}

test("upload validation accepts JPEG/PNG/WebP and uses detected extension", async () => {
  for (const [type, bytes] of Object.entries(signatures)) {
    const harness = serviceHarness();
    const result = await harness.richContentImagesService.upload(
      new File([Uint8Array.from(bytes)], "../../user-controlled.svg", { type }),
    );
    assert.equal(harness.uploads.length, 1);
    assert.equal(harness.uploads[0][2], type);
    assert.match(harness.uploads[0][0], new RegExp(`^uploads/\\d{4}/\\d{2}/[0-9a-f-]+\\.${type === "image/jpeg" ? "jpg" : type.split("/")[1]}$`));
    assert.equal(result.src, imageModel.buildRichContentImagePublicUrl(harness.uploads[0][0]));
    assert.doesNotMatch(harness.uploads[0][0], /user-controlled|\.svg|\.\./);
  }
});

test("upload validation rejects empty, oversized, unsupported and spoofed files", async () => {
  const { validateRichContentImageFile } = serviceHarness();
  for (const file of [
    new File([], "empty.png", { type: "image/png" }),
    new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    new File([Uint8Array.from([0x47, 0x49, 0x46, 0x38])], "a.gif", { type: "image/gif" }),
    new File(["<svg><script/></svg>"], "a.svg", { type: "image/svg+xml" }),
    new File([Uint8Array.from(signatures["image/png"])], "spoof.jpg", { type: "image/jpeg" }),
  ]) await assert.rejects(() => validateRichContentImageFile(file), { name: "RichContentImageInputError" });
});

test("Storage repository fixes bucket and disables upsert", async () => {
  const calls = [];
  const repository = load("src/repositories/rich-content-images.repository.ts", {
    "@/libs/supabase/server": { supabase: { storage: {
      from(bucket) { calls.push(["bucket", bucket]); return {
        async upload(...args) { calls.push(["upload", ...args]); return { error: null }; },
      }; },
    } } },
  }).richContentImagesRepository;
  await repository.upload(path, Uint8Array.from(signatures["image/webp"]), "image/webp");
  assert.deepEqual(calls[0], ["bucket", "rich-content-images"]);
  assert.equal(calls[1][3].upsert, false);
  assert.equal(calls[1][3].contentType, "image/webp");
});

function routeHarness(authorization, upload) {
  class InputError extends Error {}
  const incidents = [];
  const { POST } = load("src/app/api/admin/rich-content/images/route.ts", {
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async () => authorization },
    "@/services/rich-content-images/rich-content-images.service": { richContentImagesService: { upload } },
    "@/services/rich-content-images/rich-content-images.errors": { RichContentImageInputError: InputError },
    "@/libs/api/server-response": { unexpectedErrorResponse: (_, error, message) => {
      incidents.push(error);
      return Response.json({ message, errorId: "ERR-TESTSAFE" }, { status: 500 });
    } },
  });
  return { POST, InputError, incidents };
}

function uploadRequest(entries = [["file", new File([Uint8Array.from(signatures["image/png"])], "a.png", { type: "image/png" })]]) {
  const body = new FormData();
  for (const [key, value] of entries) body.append(key, value);
  return new Request("http://localhost/api/admin/rich-content/images", { method: "POST", body });
}

test("upload route preserves Admin authorization and minimal response", async () => {
  const denied = routeHarness({ response: new Response(null, { status: 401 }) }, async () => assert.fail());
  assert.equal((await denied.POST(uploadRequest())).status, 401);
  const forbidden = routeHarness({ response: new Response(null, { status: 403 }) }, async () => assert.fail());
  assert.equal((await forbidden.POST(uploadRequest())).status, 403);
  const allowed = routeHarness({ user: { id: "admin" }, response: null }, async () => ({ src }));
  const response = await allowed.POST(uploadRequest());
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { src } });
});

test("upload route rejects malformed, missing and multiple files", async () => {
  const harness = routeHarness({ user: { id: "admin" }, response: null }, async () => assert.fail());
  const malformed = new Request("http://localhost/api/admin/rich-content/images", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal((await harness.POST(malformed)).status, 400);
  assert.equal((await harness.POST(uploadRequest([]))).status, 400);
  assert.equal((await harness.POST(uploadRequest([
    ["file", new File(["a"], "a.png", { type: "image/png" })],
    ["file", new File(["b"], "b.png", { type: "image/png" })],
  ]))).status, 400);
  assert.equal(harness.incidents.length, 0);
});

test("provider failure is returned through the safe unexpected-error pipeline", async () => {
  const providerError = new Error("private provider detail");
  const harness = routeHarness({ user: { id: "admin" }, response: null }, async () => { throw providerError; });
  const response = await harness.POST(uploadRequest());
  const payload = await response.json();
  assert.equal(response.status, 500);
  assert.equal(payload.message, "圖片上傳失敗，請稍後再試");
  assert.doesNotMatch(JSON.stringify(payload), /private provider detail/);
  assert.deepEqual(harness.incidents, [providerError]);
});
