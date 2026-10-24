import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createRequire } from "node:module";

const source = (path) => readFile(path, "utf8");
const require = createRequire(import.meta.url);

class RepositoryError extends Error {
  constructor(context, cause) {
    super(context);
    this.cause = cause;
  }
}

async function loadCommonJs(path, overrides) {
  const javascript = ts.transpileModule(await source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", "require", javascript)(runtimeModule.exports, runtimeModule, (specifier) => specifier in overrides ? overrides[specifier] : require(specifier));
  return runtimeModule.exports;
}

test("site settings keeps a typed single-row schema", async () => {
  const migration = await source("supabase/migrations/202610240001_add_site_settings.sql");
  assert.match(migration, /create table public\.site_settings/);
  assert.match(migration, /id boolean primary key/);
  assert.match(migration, /check \(id = true\)/);
  assert.match(migration, /updated_by uuid references public\.users/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all privileges/);
});

test("site settings validates HTTPS social links and media references", async () => {
  const schema = await source("src/services/site-settings/site-settings.schema.ts");
  assert.match(schema, /protocol === "https:"/);
  assert.match(schema, /!url\.username && !url\.password/);
  assert.match(schema, /identifyMediaSource/);
  assert.match(schema, /reference\.bucket !== "rich-content-images"/);
  assert.match(schema, /reference\.objectPath\.startsWith\("site-settings\/"\)/);
  assert.match(schema, /請輸入顯示文字/);
  assert.match(schema, /請輸入有效的連結網址/);
  assert.doesNotMatch(schema, /SUPABASE_SECRET_KEY|dangerouslySetInnerHTML/);
});

test("social link validation maps label and URL errors independently", async () => {
  const provider = await source("src/components/(admin)/admin/site-settings/SiteSettingsProvider.tsx");
  const contact = await source("src/components/(admin)/admin/site-settings/sections/ContactSettings.tsx");
  assert.match(provider, /social-" \+ index \+ "-label/);
  assert.match(provider, /social-" \+ index \+ "-href/);
  assert.match(provider, /validateSocialLinks\(values\.socialLinks\)/);
  assert.match(contact, /label="顯示文字"/);
  assert.match(contact, /label="連結網址"/);
  assert.match(contact, /social-\$\{index\}-label/);
  assert.match(contact, /social-\$\{index\}-href/);
});

test("public settings has a safe fallback and server-only repository", async () => {
  const service = await source("src/services/site-settings/site-settings.service.ts");
  const repository = await source("src/repositories/site-settings.repository.ts");
  assert.match(service, /DEFAULT_SITE_SETTINGS/);
  assert.match(service, /catch/);
  assert.match(repository, /import "server-only"/);
  assert.match(repository, /updated_by: updatedBy/);
});

test("PATCH service merges partial input and uses the session user", async () => {
  let written;
  const current = { site_name: "old", site_full_name: "old full", seo_title: "SEO", seo_description: "description", contact_email: "old@example.com", social_links: [], logo_media_url: "/images/logo.jpg", favicon_media_url: "/images/favicon.ico", default_og_image_url: "/images/home/hero.jpg", hero_title: "old hero", hero_description: "old description", hero_image_url: "/images/home/hero.jpg", updated_at: "2026-01-01T00:00:00Z", updated_by: "old-admin" };
  const { siteSettingsService } = await loadCommonJs("src/services/site-settings/site-settings.service.ts", {
    "server-only": {},
    "@/libs/siteConfigs": { siteConfigs: { name: "site", fullName: "site full", title: "title", description: "description", logo: "/images/logo.jpg", icon: "/images/favicon.ico" } },
    "@/repositories/site-settings.repository": { siteSettingsRepository: { find: async () => current, upsert: async (input, updatedBy) => { written = { input, updatedBy }; return { ...current, site_name: input.siteName, updated_by: updatedBy }; } } },
    "@/repositories/shared/errors": { RepositoryError },
    "./site-settings.schema": { siteSettingsSchema: { parse: (value) => value }, siteSettingsPatchSchema: { parse: (value) => { if ("updated_by" in value) throw new Error("unknown"); return value; } } },
  });
  const result = await siteSettingsService.update({ siteName: "new site" }, "real-admin");
  assert.equal(written.updatedBy, "real-admin");
  assert.equal(written.input.siteName, "new site");
  assert.equal(written.input.seoTitle, "SEO");
  assert.equal(result.siteName, "new site");
});

test("Admin route enforces authorization and safe validation boundaries", async () => {
  const responses = { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) };
  let authorization = { user: null, response: { status: 401 } };
  let updateCalls = 0;
  let invalidations = 0;
  const route = await loadCommonJs("src/app/api/admin/site-settings/route.ts", {
    "next/server": { NextResponse: responses }, "zod": require("zod"),
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async () => authorization },
    "@/libs/api/server-response": { unexpectedErrorResponse: (_context, _error, message) => responses.json({ message }, { status: 500 }) },
    "@/services/site-settings/site-settings.service": { siteSettingsService: { getPublic: async () => ({ siteName: "ok" }), update: async (body, userId) => { updateCalls += 1; if ("updated_by" in body) throw new (require("zod").ZodError)([]); return { ...body, userId }; } } },
    "@/libs/cache/public-data": { invalidatePublicDataSafely: (key) => { if (key === "siteSettings") invalidations += 1; } },
  });
  assert.equal((await route.GET()).status, 401);
  authorization = { user: { id: "admin-1" }, response: null };
  const forged = await route.PATCH({ json: async () => ({ updated_by: "forged" }) });
  assert.equal(forged.status, 400);
  const result = await route.PATCH({ json: async () => ({ siteName: "updated" }) });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.userId, "admin-1");
  assert.equal(updateCalls, 2);
  assert.equal(invalidations, 1);
});

test("public settings falls back without exposing a repository failure", async () => {
  const logs = [];
  const { siteSettingsService, DEFAULT_SITE_SETTINGS } = await loadCommonJs("src/services/site-settings/site-settings.service.ts", {
    "server-only": {},
    "@/libs/siteConfigs": { siteConfigs: { name: "fallback", fullName: "fallback full", title: "fallback title", description: "fallback description", logo: "/logo.png", icon: "/favicon.png" } },
    "@/repositories/site-settings.repository": { siteSettingsRepository: { find: async () => { throw new RepositoryError("read", { code: "42P01", message: "database detail must stay internal" }); } } },
    "@/repositories/shared/errors": { RepositoryError },
    "./site-settings.schema": { siteSettingsSchema: { parse: (value) => value }, siteSettingsPatchSchema: { parse: (value) => value } },
  });
  const originalError = console.error;
  console.error = (...values) => logs.push(values);
  try {
    assert.deepEqual(await siteSettingsService.getPublic(), DEFAULT_SITE_SETTINGS);
    assert.deepEqual(logs[0][1], { type: "RepositoryError", code: "42P01" });
    assert.doesNotMatch(JSON.stringify(logs), /database detail must stay internal/);
  } finally {
    console.error = originalError;
  }
});

test("settings UI uses nested routes, shared draft state and purpose-specific previews", async () => {
  const [form, fields, homepage, branding, contact, seo, navigation, provider, layout, homePreview] = await Promise.all([
    source("src/components/(admin)/admin/site-settings/SiteSettingsForm.tsx"),
    source("src/components/(admin)/admin/site-settings/SiteSettingsFields.tsx"),
    source("src/components/(admin)/admin/site-settings/sections/HomepageSettings.tsx"),
    source("src/components/(admin)/admin/site-settings/sections/BrandingSettings.tsx"),
    source("src/components/(admin)/admin/site-settings/sections/ContactSettings.tsx"),
    source("src/components/(admin)/admin/site-settings/sections/SeoSettings.tsx"),
    source("src/components/(admin)/admin/site-settings/SiteSettingsNavigation.tsx"),
    source("src/components/(admin)/admin/site-settings/SiteSettingsProvider.tsx"),
    source("src/app/(admin)/admin/site-settings/layout.tsx"),
    source("src/components/(public)/home/HomeHeroPresentation.tsx"),
  ]);
  assert.doesNotMatch(navigation, /<Select id="site-settings-section"/);
  assert.match(navigation, /<nav aria-label="網站設定分類"/);
  assert.match(navigation, /href=\{item\.href\}/);
  assert.match(layout, /SiteSettingsProvider/);
  assert.match(provider, /sessionStorage\.setItem\(DRAFT_KEY/);
  assert.match(provider, /beforeunload/);
  assert.doesNotMatch(form, /sticky bottom-/);
  for (const variant of ["logo", "favicon", "og", "hero"]) {
    assert.match(`${branding}\n${homepage}\n${seo}`, new RegExp(`variant="${variant}"`));
  }
  assert.match(fields, /按下「儲存設定」後才會上傳並套用/);
  assert.match(homepage, /HomeHeroPresentation/);
  assert.match(homePreview, /min-h-104.*sm:min-h-110.*lg:min-h-124/);
  assert.match(homePreview, /preview \?/);
  assert.doesNotMatch(seo, /搜尋引擎會自行決定實際呈現方式/);
  assert.match(form, /BrandingSettings/);
  assert.match(form, /HomepageSettings/);
  assert.match(branding, /網站 Logo/);
  assert.match(contact, /官方社群連結/);
});

test("site settings image service validates upload input and returns an owned media URL", async () => {
  const uploads = [];
  const { siteSettingsImageService } = await loadCommonJs("src/services/site-settings/site-settings-image.service.ts", {
    "server-only": {}, "node:crypto": { randomUUID: () => "image-id" },
    "@/libs/images/file-signature": { detectSupportedImage: () => ({ mimeType: "image/png", extension: "png" }) },
    "@/libs/media/media-url": { buildSiteMediaUrl: (reference) => `/media/${reference.bucket}/${reference.objectPath}` },
    "@/libs/media/media-path": { createStorageMediaReference: (bucket, objectPath) => ({ bucket, objectPath }) },
    "@/repositories/site-settings-image.repository": { siteSettingsImageRepository: { upload: async (...args) => uploads.push(args) } },
  });
  const file = { size: 4, type: "image/png", arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer };
  assert.deepEqual(await siteSettingsImageService.upload("og", file), { src: "/media/rich-content-images/site-settings/og-image-id.png" });
  assert.equal(uploads.length, 1);
  await assert.rejects(() => siteSettingsImageService.upload("other", file), /Invalid image field/);
  await assert.rejects(() => siteSettingsImageService.upload("logo", { ...file, size: 4 * 1024 * 1024 + 1 }), /Image size/);
});

test("site settings image route enforces admin authorization and validated form fields", async () => {
  const responses = { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) };
  let authorization = { user: null, response: { status: 401 } };
  let uploads = 0;
  const route = await loadCommonJs("src/app/api/admin/site-settings/images/route.ts", {
    "next/server": { NextResponse: responses },
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async () => authorization },
    "@/libs/api/server-response": { unexpectedErrorResponse: (_context, _error, message) => responses.json({ message }, { status: 500 }) },
    "@/services/site-settings/site-settings-image.service": { siteSettingsImageService: { upload: async () => { uploads += 1; return { src: "/media/rich-content-images/site-settings/logo.png" }; } } },
  });
  const request = { formData: async () => new Map([["field", "logo"], ["file", new File([new Uint8Array([1])], "logo.png", { type: "image/png" })]]) };
  assert.equal((await route.POST(request)).status, 401);
  authorization = { user: { id: "admin" }, response: null };
  assert.equal((await route.POST(request)).status, 201);
  assert.equal(uploads, 1);
  assert.equal((await route.POST({ formData: async () => new Map([["field", "logo"]]) })).status, 400);
});

