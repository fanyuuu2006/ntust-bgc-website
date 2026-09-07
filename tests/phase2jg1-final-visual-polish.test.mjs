import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

function parseTsx(source, fileName) {
  return ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

function findJsxNodes(sourceFile, tagName) {
  const matches = [];

  function visit(node) {
    if (
      (ts.isJsxElement(node) &&
        node.openingElement.tagName.getText(sourceFile) === tagName) ||
      (ts.isJsxSelfClosingElement(node) &&
        node.tagName.getText(sourceFile) === tagName)
    ) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return matches;
}

function hasConditionalAncestor(node, conditionText, sourceFile) {
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isConditionalExpression(current) &&
      current.condition.getText(sourceFile) === conditionText
    ) {
      return true;
    }
  }
  return false;
}

test("logout reserves feedback space only after a failure", async () => {
  const [logoutSource, feedbackSource] = await Promise.all([
    readSource("src/components/LogoutButton.tsx"),
    readSource("src/components/FormFeedback.tsx"),
  ]);
  const logoutFile = parseTsx(logoutSource, "LogoutButton.tsx");
  const feedbackNodes = findJsxNodes(logoutFile, "FormFeedback");

  assert.equal(feedbackNodes.length, 1);
  assert.equal(hasConditionalAncestor(feedbackNodes[0], "error", logoutFile), true);
  assert.match(feedbackNodes[0].getText(logoutFile), /className="mt-2"/);
  assert.doesNotMatch(logoutSource, /className="space-y-2"/);

  assert.match(feedbackSource, /aria-live="polite"/);
  assert.match(feedbackSource, /role="alert"/);
});

test("logout keeps pending protection and closes the menu only after success", async () => {
  const source = await readSource("src/components/LogoutButton.tsx");
  const request = source.indexOf("await apiClient");
  const close = source.indexOf("onClick?.(e)");
  const failure = source.indexOf("catch (caught)");

  assert.match(source, /if \(isLoading\) return;/);
  assert.match(source, /isLoading=\{isLoading\}/);
  assert.match(source, /finally\s*\{\s*setIsLoading\(false\);/);
  assert.ok(request >= 0 && close > request && failure > close);
  assert.match(source.slice(failure), /setError\(/);
  assert.doesNotMatch(source.slice(failure), /onClick\?\.\(e\)/);
});

test("homepage hero makes the slogan its only primary heading", async () => {
  const source = await readSource("src/components/(public)/home/HomeHero.tsx");
  const sourceFile = parseTsx(source, "HomeHero.tsx");
  const headings = findJsxNodes(sourceFile, "h1");

  assert.equal(headings.length, 1);
  assert.match(
    headings[0].getText(sourceFile),
    /一起玩桌遊，也一起玩出更多可能。/,
  );
  assert.doesNotMatch(headings[0].getText(sourceFile), /siteConfigs\.name/);
  assert.ok(source.indexOf("{siteConfigs.name}") < source.indexOf("{siteConfigs.fullName}"));
  assert.ok(source.indexOf("{siteConfigs.fullName}") < headings[0].pos);
  assert.equal(findJsxNodes(sourceFile, "br").length, 0);

  const actions = findJsxNodes(sourceFile, "ButtonLink");
  assert.equal(actions.length, 2);
  assert.match(source, /href="#popular-board-games"[\s\S]*找桌遊/);
  assert.match(source, /href="#latest-announcements"[\s\S]*最新公告/);
  assert.match(source, /const HERO_IMAGE_SRC = "\/images\/home\/hero\.jpg"/);
  assert.match(source, /<Image[\s\S]*?fill[\s\S]*?priority[\s\S]*?sizes="100vw"/);
  assert.doesNotMatch(source, /framer-motion|swiper|carousel/);
});
