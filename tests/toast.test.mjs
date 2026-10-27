import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () => readFile(new URL("../src/contexts/ToastContext.tsx", import.meta.url), "utf8");

test("toast provider renders only when messages exist and supports accessible dismissal", async () => {
  const text = await source();
  assert.match(text, /toasts\.length \?/);
  assert.match(text, /role=\{toast\.tone === "error" \? "alert" : "status"\}/);
  assert.match(text, /aria-label="關閉通知"/);
  assert.match(text, /current\.some\(\(item\) => item\.message === trimmed/);
  assert.match(text, /tone === "error" \? 7000 : 4000/);
});

test("profile visibility settings use toast for successful preference changes", async () => {
  const text = await readFile(new URL("../src/components/(authenticated)/settings/PublicProfileSettings.tsx", import.meta.url), "utf8");
  assert.match(text, /useToast/);
  assert.match(text, /showToast\("success"/);
  assert.match(text, /FormFeedback error=\{error\}/);
});

test("first operation batch uses toast only after successful clipboard or mutations", async () => {
  const files = await Promise.all([
    "../src/components/CopyAction.tsx",
    "../src/components/avatars/AvatarManagement.tsx",
    "../src/components/(public)/board-games/BorrowBoardGameForm.tsx",
    "../src/components/(authenticated)/borrowings/CancelBorrowingAction.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  for (const text of files) assert.match(text, /useToast/);
  assert.match(files[0], /await navigator\.clipboard\.writeText\(text\)[\s\S]*showToast\("success"/);
  assert.match(files[1], /readAvatarResponse[\s\S]*showToast\("success"/);
  assert.match(files[2], /await apiClient[\s\S]*showToast\("success"/);
  assert.match(files[3], /await apiClient[\s\S]*showToast\("success"/);
});

test("admin create actions notify only after successful API responses", async () => {
  const files = await Promise.all([
    "../src/components/(admin)/admin/board-games/categories/CategoryCreateAction.tsx",
    "../src/components/(admin)/admin/memberships/MembershipCreateButton.tsx",
    "../src/components/(admin)/admin/events/EventActions.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  for (const text of files) assert.match(text, /useToast/);
  for (const text of files) assert.match(text, /await apiClient[\s\S]*showToast\("success"/);
});

test("admin board-game and announcement mutations use operation-specific success copy", async () => {
  const files = await Promise.all([
    "../src/components/(admin)/admin/board-games/BoardGameForm.tsx",
    "../src/components/(admin)/admin/announcements/AnnouncementEditor.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  for (const text of files) {
    assert.match(text, /useToast/);
    assert.match(text, /await apiClient[\s\S]*showToast\("success"/);
  }
  assert.match(files[0], /mode === "create" \? "桌遊已新增" : "桌遊資料已更新"/);
  assert.match(files[1], /公告已刪除/);
  assert.match(files[1], /公告已發布/);
});

test("admin location, academic-year, and register-key mutations notify after success", async () => {
  const files = await Promise.all([
    "../src/components/(admin)/admin/board-games/locations/LocationCreateAction.tsx",
    "../src/components/(admin)/admin/board-games/locations/LocationRecords.tsx",
    "../src/components/(admin)/admin/academic-years/AcademicYearActions.tsx",
    "../src/components/(admin)/admin/memberships/RegisterKeyGenerateForm.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

  for (const text of files.slice(0, 3)) {
    assert.match(text, /useToast/);
    assert.match(text, /showToast\("success"/);
  }
  assert.match(files[0], /await apiClient[\s\S]*showToast\("success"/);
  assert.match(files[1], /await apiClient[\s\S]*showToast\("success"/);
  assert.match(files[2], /await apiClient[\s\S]*showToast\("success"/);
  assert.match(files[3], /await apiClient[\s\S]*setView\("results"\)/);
  assert.doesNotMatch(files[3], /已產生 .*社員註冊序號/);
  assert.match(files[3], /copied|已複製/);
});

test("admin review deletion and event mutations notify only after successful APIs", async () => {
  const files = await Promise.all([
    "../src/components/(admin)/admin/reviews/AdminReviewRecords.tsx",
    "../src/components/(admin)/admin/events/EventRecords.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

  for (const text of files) {
    assert.match(text, /useToast/);
    assert.match(text, /showToast\("success"/);
    assert.match(text, /ConfirmDialog/);
    assert.match(text, /router\.refresh\(\)/);
  }
  assert.match(files[0], /await apiClient[\s\S]*setDeleting\(null\)[\s\S]*showToast\("success", "評論已刪除"\)/);
  assert.match(files[1], /await apiClient[\s\S]*setSelectedEvent\(null\)[\s\S]*showToast\("success", "活動已更新"\)/);
  assert.match(files[1], /showToast\("success", "活動已刪除"\)/);
});
