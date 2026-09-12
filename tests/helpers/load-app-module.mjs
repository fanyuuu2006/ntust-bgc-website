import {readFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {createRequire} from "node:module";
import ts from "typescript";
const root=resolve(import.meta.dirname,"../..");
const require=createRequire(import.meta.url);
export function load(path, mocks = {}) {
  const filename = resolve(root, path);
  const loadedModule = { exports: {} };
  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "module", "exports", js)((id) => {
    if (id in mocks) return mocks[id];
    if (id === "server-only") return {};
    if (id.startsWith("@/") || id.startsWith(".")) {
      const base = id.startsWith("@/") ? resolve(root, "src", id.slice(2)) : resolve(dirname(filename), id);
      for (const ext of [".ts", ".tsx"]) {
        try { readFileSync(base + ext); } catch { continue; }
        return load(base + ext, mocks);
      }
    }
    return require(id);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
