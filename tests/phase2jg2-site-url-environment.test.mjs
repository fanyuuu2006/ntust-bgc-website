import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const nodeRequire = createRequire(import.meta.url);

async function loadEnvironmentModule() {
  const source = await readFile(new URL("src/libs/env.tsx", root), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };

  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    nodeRequire,
  );

  return runtimeModule.exports;
}

function requireExport(module, name) {
  assert.equal(typeof module[name], "function", `${name} must be exported`);
  return module[name];
}

test("canonical site URL accepts only an absolute HTTP origin and removes its trailing slash", async () => {
  const environment = await loadEnvironmentModule();
  const resolveSiteUrl = requireExport(environment, "resolveSiteUrl");

  assert.equal(
    resolveSiteUrl("  https://ntust-bgc.vercel.app/  ", "production"),
    "https://ntust-bgc.vercel.app",
  );
  assert.equal(
    resolveSiteUrl("http://localhost:3001/", "development"),
    "http://localhost:3001",
  );

  for (const invalid of [
    "not-a-url",
    "ftp://example.com",
    "https://example.com/club",
    "https://example.com/?preview=1",
    "https://user:password@example.com",
  ]) {
    assert.throws(
      () => resolveSiteUrl(invalid, "production"),
      /SITE_URL/,
      invalid,
    );
  }
});

test("production requires SITE_URL while development and test use an explicit local origin", async () => {
  const environment = await loadEnvironmentModule();
  const resolveSiteUrl = requireExport(environment, "resolveSiteUrl");

  assert.throws(() => resolveSiteUrl(undefined, "production"), /SITE_URL/);
  assert.throws(() => resolveSiteUrl("   ", "production"), /SITE_URL/);
  assert.equal(
    resolveSiteUrl(undefined, "development"),
    "http://localhost:3000",
  );
  assert.equal(resolveSiteUrl(undefined, "test"), "http://localhost:3000");
});

test("Vercel preview variables never replace the configured canonical origin", async () => {
  const environment = await loadEnvironmentModule();
  const getSiteUrl = requireExport(environment, "getSiteUrl");
  const previous = {
    siteUrl: process.env.SITE_URL,
    vercelUrl: process.env.VERCEL_URL,
    productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  };

  delete process.env.SITE_URL;
  process.env.VERCEL_URL = "preview-branch.vercel.app";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "project.vercel.app";

  try {
    assert.throws(() => getSiteUrl("production"), /SITE_URL/);
  } finally {
    if (previous.siteUrl === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previous.siteUrl;
    if (previous.vercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previous.vercelUrl;
    if (previous.productionUrl === undefined)
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    else
      process.env.VERCEL_PROJECT_PRODUCTION_URL = previous.productionUrl;
  }
});
