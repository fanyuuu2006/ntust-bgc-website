import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("authenticated routes provide page or result-shaped busy states and a shared recoverable error boundary", async () => {
  const [errorBoundary, ...loadingStates] = await Promise.all([
    readSource("src/app/(authenticated)/error.tsx"),
    readSource("src/app/(authenticated)/dashboard/loading.tsx"),
    readSource("src/app/(authenticated)/profile/loading.tsx"),
    readSource("src/app/(authenticated)/settings/loading.tsx"),
    readSource("src/components/(authenticated)/borrowings/BorrowingsResultsLoading.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsLoading.tsx"),
  ]);

  assert.match(errorBoundary, /"use client"/);
  assert.match(errorBoundary, /role="alert"/);
  assert.match(errorBoundary, /reset\(\)/);
  assert.match(errorBoundary, /重新載入/);

  for (const loadingState of loadingStates) {
    assert.match(loadingState, /aria-busy="true"/);
    assert.match(loadingState, /skeleton/);
  }

  assert.match(loadingStates[0], /aria-label="頁面載入中"/);
  assert.match(loadingStates[3], /aria-label="正在更新借用紀錄"/);
  assert.match(loadingStates[4], /aria-label="正在更新社員紀錄"/);
  assert.notEqual(loadingStates[0], loadingStates[3]);
});

test("profile and memberships recover from distinct missing and empty data states", async () => {
  const [profilePage, membershipsPage, membershipResults, dashboardMembership] = await Promise.all([
    readSource("src/app/(authenticated)/profile/page.tsx"),
    readSource("src/app/(authenticated)/memberships/page.tsx"),
    readSource("src/components/(authenticated)/memberships/MembershipRecordsResults.tsx"),
    readSource("src/components/(authenticated)/dashboard/DashboardMembershipSummary.tsx"),
  ]);

  assert.doesNotMatch(profilePage, /if \(!profile\) return null/);
  assert.match(profilePage, /個人資料暫時無法載入/);
  assert.match(profilePage, /帳號仍可正常使用/);

  assert.match(membershipsPage, /MembershipRecordsResults/);
  assert.match(membershipsPage, /currentAcademicYear \?/);
  assert.match(membershipsPage, /目前尚未設定可入社的學年度/);
  assert.match(membershipResults, /hasQuery/);
  assert.match(membershipResults, /目前沒有社員紀錄/);
  assert.match(membershipResults, /找不到符合條件的社員紀錄/);
  assert.match(dashboardMembership, /hasCurrentAcademicYear/);
  assert.match(dashboardMembership, /目前尚未設定可入社的學年度/);
});

test("confirm dialogs keep safe focus and cannot be dismissed during a destructive mutation", async () => {
  const [dialog, modal] = await Promise.all([
    readSource("src/components/ConfirmDialog.tsx"),
    readSource("src/components/Modal.tsx"),
  ]);

  assert.match(dialog, /closeDisabled=\{isSubmitting\}/);
  assert.match(dialog, /autoFocus/);
  assert.match(modal, /closeDisabled\?: boolean/);
  assert.match(modal, /if \(!closeDisabled\) onClose\(\)/);
  assert.match(modal, /disabled=\{closeDisabled\}/);
  assert.match(modal, /break-words/);
});

test("authenticated disclosures, forms, and page titles expose resilient accessibility state", async () => {
  const [badges, account, profile, password, pageHeader, feedback] = await Promise.all([
    readSource("src/components/(authenticated)/profile/ProfileIdentityBadges.tsx"),
    readSource("src/components/(authenticated)/settings/AccountSettingsForm.tsx"),
    readSource("src/components/(authenticated)/settings/ProfileSettingsForm.tsx"),
    readSource("src/components/(authenticated)/settings/PasswordSettingsForm.tsx"),
    readSource("src/components/PageHeader.tsx"),
    readSource("src/components/FormFeedback.tsx"),
  ]);

  assert.match(badges, /aria-label=\{[\s\S]*顯示其餘/);
  assert.match(badges, /aria-expanded=\{isExpanded\}/);
  assert.match(badges, /hidden=\{!isExpanded\}/);
  assert.match(badges, /hiddenBadges\.map/);
  assert.match(badges, /aria-live="polite"/);

  for (const form of [account, profile, password]) {
    assert.match(form, /aria-busy=\{isLoading \|\| undefined\}/);
  }

  assert.match(pageHeader, /break-words/);
  assert.doesNotMatch(feedback, /if \(!error && !success && !warning && !info\)/);
  assert.match(feedback, /aria-live="polite"/);
});
