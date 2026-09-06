import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public 404 adds desktop balance without changing mobile or scroll ownership", async () => {
  const notFound = await readSource("src/app/(public)/not-found.tsx");

  assert.match(notFound, /className="container py-8 lg:py-24"/);
  assert.doesNotMatch(
    notFound,
    /min-h-screen|min-h-dvh|h-screen|100vh|position:\s*fixed|\bfixed\b|\bsticky\b/,
  );
});

test("borrow confirmation uses a compact dialog and gives the game name hierarchy", async () => {
  const [dialog, modal, form] = await Promise.all([
    readSource("src/components/ConfirmDialog.tsx"),
    readSource("src/components/Modal.tsx"),
    readSource("src/components/(public)/board-games/BorrowBoardGameForm.tsx"),
  ]);

  assert.match(dialog, /size\?: ModalSize/);
  assert.match(dialog, /size=\{size\}/);
  assert.match(modal, /description\?: React\.ReactNode/);
  assert.match(form, /<ConfirmDialog[\s\S]*?size="sm"/);
  assert.match(
    form,
    /<span[^>]*font-semibold[^>]*>[\s\S]*?\{boardGameName\}[\s\S]*?<\/span>/,
  );
  assert.match(dialog, /autoFocus/);
  assert.match(modal, /<X[^>]*aria-hidden/);
});

test("detail image stage softens real-image chrome while preserving fallback support", async () => {
  const detail = await readSource(
    "src/app/(public)/board-games/[id]/page.tsx",
  );

  assert.match(detail, /aspect-4\/3/);
  assert.match(detail, /boardGame\.image/);
  assert.match(detail, /border-\(--border-muted\).*bg-\(--surface-default\)/s);
  assert.match(detail, /border-\(--border-default\).*bg-\(--surface-subtle\)/s);
  assert.match(detail, /h-full w-full object-contain/);
});

test("header brand focus remains keyboard-only through the global focus-visible rule", async () => {
  const [header, globals] = await Promise.all([
    readSource("src/components/Header/Header.tsx"),
    readSource("src/styles/globals.css"),
  ]);

  assert.match(header, /<Link[\s\S]*?href="\/"/);
  assert.match(globals, /:is\(a, button, \.btn, input, textarea, summary\):focus-visible/);
  assert.doesNotMatch(header, /focus:outline-none|focus-visible:outline-none/);
});
