import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadFetchModule() {
  const source = await readSource("src/libs/supabase/fetch.ts");
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
    (specifier) => {
      if (specifier === "server-only") return {};
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
  );
  return runtimeModule.exports;
}

function response(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("Supabase fetch retries one read only for exact future-issued PGRST303", async () => {
  const { createSupabaseFetch } = await loadFetchModule();
  let calls = 0;
  const wrapped = createSupabaseFetch(async () => {
    calls += 1;
    return calls === 1
      ? response(401, { code: "PGRST303", message: "JWT issued at future" })
      : response(200, []);
  }, async () => {});

  const result = await wrapped("https://example.test/rest/v1/games", {
    method: "GET",
  });
  assert.equal(result.status, 200);
  assert.equal(calls, 2);
});

test("Supabase fetch does not retry unrelated failures or retry more than once", async () => {
  const { createSupabaseFetch } = await loadFetchModule();

  for (const failure of [
    { code: "PGRST301", message: "Invalid JWT" },
    { code: "PGRST303", message: "other claims failure" },
  ]) {
    let calls = 0;
    const wrapped = createSupabaseFetch(async () => {
      calls += 1;
      return response(401, failure);
    }, async () => {});
    assert.equal((await wrapped("https://example.test", { method: "GET" })).status, 401);
    assert.equal(calls, 1);
  }

  let futureCalls = 0;
  const alwaysFuture = createSupabaseFetch(async () => {
    futureCalls += 1;
    return response(401, { code: "PGRST303", message: "JWT issued at future" });
  }, async () => {});
  assert.equal((await alwaysFuture("https://example.test", { method: "GET" })).status, 401);
  assert.equal(futureCalls, 2);
});

test("Supabase fetch never retries writes", async () => {
  const { createSupabaseFetch } = await loadFetchModule();
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    let calls = 0;
    const wrapped = createSupabaseFetch(async () => {
      calls += 1;
      return response(401, { code: "PGRST303", message: "JWT issued at future" });
    }, async () => {});
    assert.equal((await wrapped("https://example.test", { method })).status, 401);
    assert.equal(calls, 1, method);
  }
});

test("the retry lives at the Supabase request boundary and public repositories keep failing normally", async () => {
  const [server, categories, publicViewer] = await Promise.all([
    readSource("src/libs/supabase/server.tsx"),
    readSource("src/repositories/board-game-categories.repository.ts"),
    readSource("src/libs/public-viewer.ts"),
  ]);
  assert.match(server, /createSupabaseFetch/);
  assert.match(server, /global:\s*\{\s*fetch/);
  assert.match(categories, /throwRepositoryError/);
  assert.doesNotMatch(categories, /retry|PGRST303|catch/);
  assert.doesNotMatch(publicViewer, /PGRST303|retry|board_game_categories/);
});
