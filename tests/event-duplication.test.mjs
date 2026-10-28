import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("event duplication reuses content but leaves lifecycle fields and dates to the new form", () => {
  const page = readFileSync("src/app/(admin)/admin/events/page.tsx", "utf8");
  const actions = readFileSync("src/components/(admin)/admin/events/EventActions.tsx", "utf8");
  assert.match(page, /duplicate/);
  assert.match(page, /getEventById/);
  assert.match(page, /key=\{`\$\{params\.template/);
  assert.match(actions, /duplicateEvent/);
  assert.match(actions, /setSubmitMode\(duplicateEvent \? "draft"/);
  assert.match(actions, /start_time: ""/);
  assert.match(actions, /end_time: ""/);
  assert.match(actions, /useState<"published" \| "draft">\(duplicateEvent \? "draft"/);
});

test("event actions expose duplication and save-as-template through the existing menu", () => {
  const menu = readFileSync("src/components/(admin)/admin/events/EventMoreMenu.tsx", "utf8");
  assert.match(menu, /複製活動/);
  assert.match(menu, /儲存為範本/);
});
