import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);

async function loadOptionalCommonJsModule(path) {
  let source;

  try {
    source = await readFile(new URL(path, root), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }

  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  new Function("exports", "module", javascript)(
    runtimeModule.exports,
    runtimeModule,
  );
  return runtimeModule.exports;
}

test("announcement pagination recognizes only PostgREST unsatisfied ranges as empty pages", async () => {
  const runtimeModule = await loadOptionalCommonJsModule(
    "src/repositories/announcements.utils.ts",
  );

  assert.ok(runtimeModule, "expected announcement range error handling utility");
  assert.equal(
    runtimeModule.isPostgrestRangeNotSatisfiable({ code: "PGRST103" }),
    true,
  );
  assert.equal(
    runtimeModule.isPostgrestRangeNotSatisfiable({ code: "PGRST303" }),
    false,
  );
  assert.equal(runtimeModule.isPostgrestRangeNotSatisfiable({}), false);
  assert.equal(runtimeModule.isPostgrestRangeNotSatisfiable(null), false);
});
