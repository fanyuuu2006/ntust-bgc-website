import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("Admin API auth boundary distinguishes unauthenticated and forbidden requests", async () => {
  const [helper, verifiedHelper] = await Promise.all([
    readSource("src/libs/api/admin-authorization.ts"),
    readSource("src/libs/api/verified-authorization.ts"),
  ]);

  assert.match(verifiedHelper, /if \(!user\)[\s\S]*status: 401/);
  assert.match(helper, /authorizeVerifiedRequest/);
  assert.match(helper, /isAdminByUserId\(user\.id\)[\s\S]*status: 403/);
  assert.match(helper, /return \{ user, response: null \}/);
});

test("Admin routes no longer collapse missing sessions and non-admin users into one boolean guard", async () => {
  const paths = [
    "src/app/api/admin/academic-years/route.ts",
    "src/app/api/admin/academic-years/[id]/route.ts",
    "src/app/api/admin/announcements/route.ts",
    "src/app/api/admin/announcements/[id]/route.ts",
    "src/app/api/admin/board-game-categories/route.ts",
    "src/app/api/admin/board-game-categories/[id]/route.ts",
    "src/app/api/admin/board-game-locations/route.ts",
    "src/app/api/admin/board-game-locations/[id]/route.ts",
    "src/app/api/admin/events/route.ts",
    "src/app/api/admin/events/[id]/route.ts",
    "src/app/api/admin/events/[id]/attendances/route.ts",
    "src/app/api/admin/events/[id]/attendances/[attendanceId]/route.ts",
    "src/app/api/admin/memberships/route.ts",
    "src/app/api/admin/memberships/[id]/route.ts",
    "src/app/api/admin/officers/route.ts",
    "src/app/api/admin/officers/[id]/route.ts",
    "src/app/api/admin/users/[id]/profile/route.ts",
  ];
  const sources = await Promise.all(paths.map(readSource));

  for (const [index, source] of sources.entries()) {
    assert.match(source, /authorizeAdminRequest/);
    assert.doesNotMatch(
      source,
      /async function (?:admin|authorized|requireAdmin)[\s\S]*isAdminByUserId/,
      paths[index],
    );
  }
});
