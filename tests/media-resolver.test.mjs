import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./helpers/load-app-module.mjs";

const origin = "https://mrsyfssstigartmhofuz.supabase.co";
const reference = {
  kind: "supabase-storage",
  bucket: "rich-content-images",
  objectPath: "uploads/2026/10/123e4567-e89b-42d3-a456-426614174000.webp",
};

const media = load("src/libs/media/media-url.ts");
const path = load("src/libs/media/media-path.ts");

test("media resolver accepts the three public buckets and nested paths", () => {
  for (const bucket of ["rich-content-images", "board-game-images", "avatars"]) {
    assert.ok(path.createStorageMediaReference(bucket, reference.objectPath));
  }
  assert.equal(media.parseSiteMediaUrl(media.buildSiteMediaUrl(reference)).objectPath, reference.objectPath);
});

test("media path rejects traversal, encoding ambiguity and path confusion", () => {
  for (const value of ["", "../secret", "uploads/%2e%2e/secret", "uploads/%252e%252e/secret", "uploads\\secret", "/absolute", "uploads//empty"]) {
    assert.equal(path.isSafeMediaObjectPath(value), false, value);
  }
  assert.equal(path.createStorageMediaReference("unknown", "image.png"), null);
});

test("site URL round-trips without exposing the Supabase origin", () => {
  const siteUrl = media.buildSiteMediaUrl(reference);
  assert.equal(siteUrl, "/media/rich-content-images/uploads/2026/10/123e4567-e89b-42d3-a456-426614174000.webp");
  assert.deepEqual(media.parseSiteMediaUrl(siteUrl), reference);
  assert.equal(media.parseSiteMediaUrl(`${siteUrl}?download=1`), null);
  assert.equal(media.parseSiteMediaUrl("https://evil.example/media/avatars/a.png"), null);
});

test("Supabase parsing is restricted to the configured HTTPS origin", () => {
  const url = `${origin}/storage/v1/object/public/${reference.bucket}/${reference.objectPath}`;
  assert.deepEqual(media.parseSupabasePublicMediaUrl(url, origin), reference);
  assert.equal(media.parseSupabasePublicMediaUrl(url, "https://gcydchpuckbmctcjpokz.supabase.co"), null);
  assert.equal(media.parseSupabasePublicMediaUrl(url.replace("https://", "http://"), origin), null);
  assert.equal(media.parseSupabasePublicMediaUrl(`${url}?x=1`, origin), null);
  assert.equal(media.parseSupabasePublicMediaUrl(url.replace(origin, "https://user:pass@mrsyfssstigartmhofuz.supabase.co"), origin), null);
});

test("source identification keeps external avatars separate from Storage references", () => {
  assert.equal(media.identifyMediaSource("https://external.example/avatar.webp", origin).kind, "external-url");
  assert.equal(media.identifyMediaSource("javascript:alert(1)", origin).kind, "invalid");
  assert.equal(media.identifyMediaSource(media.buildSiteMediaUrl(reference), origin).kind, "site-media-url");
});

test("display URL resolver converts owned legacy media and preserves external avatars", () => {
  assert.equal(
    media.resolveMediaDisplayUrl(`${origin}/storage/v1/object/public/avatars/users/a.webp`, origin),
    "/media/avatars/users/a.webp",
  );
  assert.equal(media.resolveMediaDisplayUrl("/media/avatars/users/a.webp", origin), "/media/avatars/users/a.webp");
  assert.equal(media.resolveMediaDisplayUrl("https://external.example/avatar.webp", origin), "https://external.example/avatar.webp");
  assert.equal(media.resolveMediaDisplayUrl("https://other.supabase.co/storage/v1/object/public/avatars/a.webp", origin), "https://other.supabase.co/storage/v1/object/public/avatars/a.webp");
  assert.equal(media.resolveMediaDisplayUrl("/avatar.png", origin), "/avatar.png");
  assert.equal(media.resolveMediaDisplayUrl("//evil.example/avatar.png", origin), null);
  assert.equal(media.resolveMediaDisplayUrl("javascript:alert(1)", origin), null);
});
