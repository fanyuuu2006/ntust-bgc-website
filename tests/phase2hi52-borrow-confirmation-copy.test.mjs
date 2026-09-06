import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("borrow confirmation separates the game identity from concise supporting copy", async () => {
  const form = await readSource(
    "src/components/(public)/board-games/BorrowBoardGameForm.tsx",
  );

  assert.doesNotMatch(form, /你將申請借用/);
  assert.doesNotMatch(form, /確認借用安排/);
  assert.match(form, /title="確認申請借用？"/);
  assert.match(
    form,
    /<span[^>]*font-semibold[^>]*break-words[^>]*>[\s\S]*?\{boardGameName\}[\s\S]*?<\/span>/,
  );
  assert.match(
    form,
    /<span[^>]*text-sm[^>]*text-\(--text-muted\)[^>]*>[\s\S]*?送出後由幹部審核。[\s\S]*?<\/span>/,
  );
  assert.doesNotMatch(form, /line-clamp|truncate/);
});

test("confirmation actions and safe focus behavior remain unchanged", async () => {
  const [form, dialog] = await Promise.all([
    readSource("src/components/(public)/board-games/BorrowBoardGameForm.tsx"),
    readSource("src/components/ConfirmDialog.tsx"),
  ]);

  assert.match(form, /size="sm"/);
  assert.match(form, /confirmLabel="確認申請"/);
  assert.match(form, /onConfirm=\{handleSubmit\}/);
  assert.match(dialog, /flex flex-col-reverse[^"\n]*sm:flex-row sm:justify-end/);
  assert.match(dialog, /variant="outline"[\s\S]*?autoFocus[\s\S]*?>\s*取消/);
  assert.match(dialog, /closeDisabled=\{isSubmitting\}/);
});
