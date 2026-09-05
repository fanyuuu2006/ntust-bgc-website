import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("authenticated borrowing requires the shared confirmation dialog before mutation", async () => {
  const [form, panel, dialog, modal] = await Promise.all([
    readSource("src/components/(public)/board-games/BorrowBoardGameForm.tsx"),
    readSource("src/components/(public)/board-games/BoardGameBorrowingPanel.tsx"),
    readSource("src/components/ConfirmDialog.tsx"),
    readSource("src/components/Modal.tsx"),
  ]);

  assert.match(form, /ConfirmDialog/);
  assert.match(form, /boardGameName/);
  assert.match(form, /setOpen\(true\)/);
  assert.match(form, /onConfirm=\{handleSubmit\}/);
  assert.match(form, /確認申請借用？/);
  assert.match(form, /你將申請借用「\$\{boardGameName\}」/);
  assert.match(form, /確認申請/);
  assert.doesNotMatch(form, /window\.confirm/);

  const trigger = form.match(/<Button[\s\S]*?<\/Button>/)?.[0] ?? "";
  assert.match(trigger, /type="button"/);
  assert.match(trigger, /setOpen\(true\)/);
  assert.doesNotMatch(trigger, /handleSubmit/);

  assert.match(panel, /boardGameName=\{boardGameName\}/);
  assert.match(panel, /showNonCurrentMemberNotice=\{!isCurrentAcademicYearMember\}/);
  assert.match(dialog, /children\?: React\.ReactNode/);
  assert.match(modal, /<dialog/);
  assert.match(modal, /onCancel/);
  assert.match(modal, /previouslyFocusedElement/);
});

test("confirmation repeats the established non-current-member notice without gating submission", async () => {
  const [form, policy] = await Promise.all([
    readSource("src/components/(public)/board-games/BorrowBoardGameForm.tsx"),
    readSource("src/libs/clubPolicies.ts"),
  ]);

  assert.match(form, /showNonCurrentMemberNotice/);
  assert.match(form, /nonCurrentAcademicYearMemberBorrowingNotice/);
  assert.match(form, /<Info/);
  assert.match(policy, /nonCurrentAcademicYearMemberBorrowingNotice/);
  assert.doesNotMatch(form, /href="\/memberships"/);
  assert.equal((form.match(/apiClient/g) ?? []).length, 2);
});

test("detail polish bounds the desktop image and keeps compact natural-height sections", async () => {
  const [page, panel] = await Promise.all([
    readSource("src/app/(public)/board-games/[id]/page.tsx"),
    readSource("src/components/(public)/board-games/BoardGameBorrowingPanel.tsx"),
  ]);

  assert.match(page, /aspect-4\/3/);
  assert.doesNotMatch(page, /lg:aspect-square/);
  assert.doesNotMatch(page, /object-cover/);
  assert.match(page, /BoardGameBorrowingPanel[\s\S]*boardGameName=\{boardGame\.name\}/);
  assert.equal((page.match(/max-w-6xl/g) ?? []).length, 1);
  assert.equal((page.match(/max-w-4xl/g) ?? []).length, 1);
  assert.match(
    page,
    /className="mt-8 max-w-4xl border-t border-\(--border-muted\) pt-6"/,
  );
  assert.doesNotMatch(
    page,
    /className="[^"]*max-w-4xl[^"]*mx-auto|className="[^"]*mx-auto[^"]*max-w-4xl/,
  );
  assert.doesNotMatch(panel, /(?:min-h-|h-\[|h-dvh|h-screen)/);
  assert.match(panel, /p-4/);
});
