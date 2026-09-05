import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const loadIntentBuilder = async () => {
  const source = await readSource(
    "src/components/(admin)/admin/announcements/announcementEditor.utils.ts",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  return import(moduleUrl);
};

test("announcement submit payload carries the explicit draft or publish intent", async () => {
  const { buildAnnouncementSubmitPayload } = await loadIntentBuilder();
  const fields = { title: "測試公告", content: "公告內容" };

  assert.deepEqual(
    buildAnnouncementSubmitPayload({
      ...fields,
      currentPublished: false,
      intent: "save",
    }),
    { ...fields, is_published: false },
  );

  assert.deepEqual(
    buildAnnouncementSubmitPayload({
      ...fields,
      currentPublished: false,
      intent: "publish",
    }),
    { ...fields, is_published: true },
  );

  assert.deepEqual(
    buildAnnouncementSubmitPayload({
      ...fields,
      currentPublished: true,
      intent: "save",
    }),
    { ...fields, is_published: true },
  );
});

test("AnnouncementEditor connects each submit action to the shared payload pathway", async () => {
  const editor = await readSource(
    "src/components/(admin)/admin/announcements/AnnouncementEditor.tsx",
  );

  assert.match(editor, /buildAnnouncementSubmitPayload/);
  assert.match(editor, /save\("save"\)/);
  assert.match(editor, /save\("publish"\)/);
  assert.doesNotMatch(editor, /const submitPublished\s*=/);
  assert.equal((editor.match(/apiClient\(/g) ?? []).length, 2);
});
