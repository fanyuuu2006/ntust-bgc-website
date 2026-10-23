import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./helpers/load-app-module.mjs";

const origin = "https://mrsyfssstigartmhofuz.supabase.co";
const objectPath = ["uploads", "2026", "10", "123e4567-e89b-42d3-a456-426614174000.webp"];

function createRoute(fetchImpl) {
  globalThis.fetch = fetchImpl;
  return load("src/app/media/[bucket]/[...objectPath]/route.ts", {
    "next/server": { NextResponse: globalThis.Response },
    "@/libs/env": { SUPABASE_URL: origin },
  });
}

function context(bucket = "rich-content-images", path = objectPath) {
  return { params: Promise.resolve({ bucket, objectPath: path }) };
}

test("media route proxies allowed images and keeps only safe response headers", async () => {
  const upstream = new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: {
      "content-type": "image/webp",
      "content-length": "3",
      "set-cookie": "secret=should-not-forward",
      "x-internal": "hidden",
    },
  });
  const route = createRoute(async (url, init) => {
    assert.equal(url, `${origin}/storage/v1/object/public/rich-content-images/${objectPath.join("/")}`);
    assert.equal(init.method, "GET");
    return upstream;
  });

  const response = await route.GET(new Request("https://site.example/media/rich-content-images/uploads/2026/10/123e4567-e89b-42d3-a456-426614174000.webp"), context());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal(response.headers.get("content-length"), "3");
  assert.match(response.headers.get("cache-control"), /s-maxage=86400/);
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(response.headers.get("x-internal"), null);
});

test("media route handles HEAD without returning an image body", async () => {
  const route = createRoute(async (_url, init) => {
    assert.equal(init.method, "HEAD");
    return new Response(null, { status: 200, headers: { "content-type": "image/png" } });
  });
  const response = await route.HEAD(new Request("https://site.example/media/avatars/a.png", { method: "HEAD" }), context("avatars", ["a.png"]));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
});

test("media route rejects invalid bucket, traversal and query before fetch", async () => {
  let calls = 0;
  const route = createRoute(async () => { calls += 1; return new Response(null); });
  assert.equal((await route.GET(new Request("https://site.example/media/private/a.png"), context("private", ["a.png"]))).status, 404);
  assert.equal((await route.GET(new Request("https://site.example/media/avatars/../secret"), context("avatars", ["..", "secret"]))).status, 404);
  assert.equal((await route.GET(new Request("https://site.example/media/avatars/a.png?download=1"), context("avatars", ["a.png"]))).status, 400);
  assert.equal(calls, 0);
});

test("media route maps upstream failures and invalid content safely", async () => {
  const notFound = createRoute(async () => new Response("provider details", { status: 404 }));
  assert.equal((await notFound.GET(new Request("https://site.example/media/avatars/a.png"), context("avatars", ["a.png"]))).status, 404);

  const providerError = createRoute(async () => new Response("secret provider error", { status: 503 }));
  const errorResponse = await providerError.GET(new Request("https://site.example/media/avatars/a.png"), context("avatars", ["a.png"]));
  assert.equal(errorResponse.status, 502);
  assert.equal(await errorResponse.text(), "");

  const invalidType = createRoute(async () => new Response("not an image", { status: 200, headers: { "content-type": "text/plain" } }));
  assert.equal((await invalidType.GET(new Request("https://site.example/media/avatars/a.png"), context("avatars", ["a.png"]))).status, 502);

  const unsupportedImage = createRoute(async () => new Response("svg", { status: 200, headers: { "content-type": "image/svg+xml" } }));
  assert.equal((await unsupportedImage.GET(new Request("https://site.example/media/avatars/a.svg"), context("avatars", ["a.svg"]))).status, 502);
});

test("media route maps upstream timeout or network failure to a safe 502", async () => {
  const route = createRoute(async () => {
    throw new Error("upstream timeout");
  });
  const response = await route.GET(new Request("https://site.example/media/avatars/a.png"), context("avatars", ["a.png"]));
  assert.equal(response.status, 502);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("cache-control"), "no-store");
});
