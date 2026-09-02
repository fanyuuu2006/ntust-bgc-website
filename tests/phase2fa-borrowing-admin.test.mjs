import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const borrowingService = read("src/services/board-games/board-games.service.ts");
const borrowRoute = read("src/app/api/board-games/[id]/borrow/route.ts");
const boardGameDetail = read("src/app/(public)/board-games/[id]/page.tsx");
const eventsService = read("src/services/events/events.service.ts");
const loginForm = read("src/components/(auth)/login/LoginForm.tsx");
const registerForm = read("src/components/(auth)/register/RegisterForm.tsx");
const adminBorrowings = read("src/components/(admin)/admin/borrowings/AdminBorrowingList.tsx");
const confirmDialog = read("src/components/ConfirmDialog.tsx");
const navigation = read("src/libs/navigation.tsx");
const borrowingConfig = read("src/libs/borrowingConfig.ts");
const clubPolicies = read("src/libs/clubPolicies.ts");
const dateUtils = read("src/utils/date.tsx");
const redirectUtils = read("src/utils/redirect.ts");

test("borrowing permission is authenticated-user only while check-in retains its membership rule", () => {
  const requestBorrowing = borrowingService.slice(
    borrowingService.indexOf("requestBorrowing:"),
    borrowingService.indexOf("approveBorrowing:"),
  );

  assert.doesNotMatch(requestBorrowing, /isCurrentActiveMember/);
  assert.doesNotMatch(requestBorrowing, /BorrowingPermissionError/);
  assert.doesNotMatch(borrowRoute, /BorrowingPermissionError/);
  assert.match(eventsService, /isCurrentActiveMember/);
});

test("board-game detail keeps the entry visible and treats non-current membership as information", () => {
  assert.match(boardGameDetail, /BorrowBoardGameForm/);
  assert.match(boardGameDetail, /登入後申請借用/);
  assert.match(boardGameDetail, /nonCurrentAcademicYearMemberBorrowingNotice/);
  assert.match(boardGameDetail, /getCurrentMembershipByUserId/);
  assert.doesNotMatch(boardGameDetail, /href="\/memberships"/);
});

test("login preserves only a safe same-site return destination", () => {
  assert.match(redirectUtils, /value\.startsWith\("\/"\)/);
  assert.match(redirectUtils, /value\.startsWith\("\/\/"\)/);
  assert.match(loginForm, /getSafeReturnPath/);
  assert.match(loginForm, /router\.replace\(returnTo\)/);
  assert.match(registerForm, /getSafeReturnPath/);
  assert.match(registerForm, /loginHref/);
});

test("club policy copy and the borrowing default have separate, centralized sources", () => {
  assert.match(borrowingConfig, /defaultDurationDays:\s*7/);
  assert.match(clubPolicies, /不是本學年度社員/);
  assert.match(clubPolicies, /領取桌遊時/);
  assert.doesNotMatch(clubPolicies, /payment_status|paid_at|fee_amount/);
});

test("checkout uses an editable Taipei-local seven-day default", () => {
  assert.match(adminBorrowings, /getFutureTaipeiDateTimeLocal\(borrowingConfig\.defaultDurationDays\)/);
  assert.match(adminBorrowings, /parseTaipeiDateTimeLocal/);
  assert.match(adminBorrowings, /type="datetime-local"/);
  assert.match(adminBorrowings, /已套用預設歸還時間，可依實際情況調整/);
  assert.match(dateUtils, /CLUB_TIME_ZONE/);
  assert.match(dateUtils, /Asia\/Taipei/);
});

test("admin borrowing shows borrower identity and membership only as operating context", () => {
  assert.match(borrowingService, /getUserMembershipEligibility\(userIds\)/);
  assert.match(borrowingService, /is_current_academic_year_member/);
  assert.match(adminBorrowings, /borrowing\.user\.email/);
  assert.match(adminBorrowings, /本學年度社員/);
  assert.match(adminBorrowings, /非本學年度社員/);
  assert.match(adminBorrowings, /adminNonCurrentAcademicYearMemberBorrowingNotice/);
  assert.doesNotMatch(adminBorrowings, /payment_status|已收費|未繳費/);
});

test("workflow confirmations distinguish destructive rejection from normal operations", () => {
  assert.match(confirmDialog, /confirmVariant\?: "primary" \| "danger"/);
  assert.match(confirmDialog, /variant=\{confirmVariant\}/);
  assert.match(adminBorrowings, /confirmVariant=\{\s*selected\?\.action === "reject" \|\| selected\?\.action === "delete"\s*\? "danger"\s*:\s*"primary"\s*\}/s);
  assert.match(adminBorrowings, /onAction\(borrowing, "approve"\).*?核准借用/s);
  assert.match(adminBorrowings, /variant="danger".*?onAction\(borrowing, "reject"\).*?拒絕申請/s);
  assert.match(adminBorrowings, /onAction\(borrowing, "checkout"\).*?確認借出/s);
  assert.match(adminBorrowings, /onAction\(borrowing, "return"\).*?確認歸還/s);
});

test("admin sidebar uses direct club-management labels without route changes", () => {
  assert.match(navigation, /label: "桌遊借用管理", href: "\/admin\/board-games\/borrowings"/);
  assert.match(navigation, /label: "社員註冊序號管理", href: "\/admin\/memberships\/register-keys"/);
  assert.match(navigation, /label: "社團內容"/);
});
