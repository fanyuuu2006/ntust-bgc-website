import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

async function loadGlobalError() {
  const source = await readSource("src/app/global-error.tsx");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const runtimeModule = { exports: {} };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const localRequire = (specifier) => {
    if (specifier === "react") {
      return { useEffect: (effect) => effect() };
    }
    if (specifier === "react/jsx-runtime") {
      return { jsx, jsxs: jsx };
    }
    if (specifier === "next/link") {
      return { __esModule: true, default: function Link() {} };
    }
    throw new Error(`Global error imported unexpected dependency: ${specifier}`);
  };
  new Function("exports", "module", "require", javascript)(
    runtimeModule.exports,
    runtimeModule,
    localRequire,
  );
  return { source, GlobalError: runtimeModule.exports.default };
}

function findElement(node, predicate) {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  const children = node.props?.children;
  const childList = Array.isArray(children) ? children : [children];
  for (const child of childList) {
    const match = findElement(child, predicate);
    if (match) return match;
  }
  return null;
}

function textContent(node) {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (!node || typeof node !== "object") return "";
  const children = node.props?.children;
  return (Array.isArray(children) ? children : [children])
    .map(textContent)
    .join("");
}

test("global error owns a self-contained accessible document fallback", async () => {
  const { source, GlobalError } = await loadGlobalError();
  const originalConsoleError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  let resetCalls = 0;
  try {
    const rendered = GlobalError({
      error: Object.assign(new Error("private server detail"), {
        digest: "private-digest",
      }),
      reset: () => {
        resetCalls += 1;
      },
    });

    assert.equal(rendered.type, "html");
    assert.equal(rendered.props.lang, "zh-Hant");
    assert.ok(findElement(rendered, (element) => element.type === "body"));
    assert.ok(findElement(rendered, (element) => element.type === "main"));

    const heading = findElement(rendered, (element) => element.type === "h1");
    assert.equal(textContent(heading), "網站暫時發生問題");
    assert.match(textContent(rendered), /目前無法正常載入這個頁面，請稍後再試。/);

    const retry = findElement(
      rendered,
      (element) => element.type === "button" && textContent(element) === "再試一次",
    );
    assert.equal(retry.props.type, "button");
    retry.props.onClick();
    assert.equal(resetCalls, 1);

    const home = findElement(
      rendered,
      (element) =>
        typeof element.type === "function" && element.props.href === "/",
    );
    assert.equal(textContent(home), "回首頁");

    const serialized = JSON.stringify(rendered);
    assert.equal(serialized.includes("private server detail"), false);
    assert.equal(serialized.includes("private-digest"), false);
    assert.deepEqual(logged, [["[GlobalError] Root-level render failed"]]);

    assert.match(source, /^"use client";/);
    assert.doesNotMatch(
      source,
      /RootLayout|WebsiteShell|UserProvider|getCurrentUser|supabase|repositories?\//i,
    );
    assert.doesNotMatch(source, /error\.(?:message|stack|digest)/);
  } finally {
    console.error = originalConsoleError;
  }
});

test("authenticated segment error boundary remains available", async () => {
  const authenticatedError = await readSource(
    "src/app/(authenticated)/error.tsx",
  );
  assert.match(authenticatedError, /^"use client";/);
  assert.match(authenticatedError, /reset/);
});
