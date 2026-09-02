import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("users remain website accounts rather than a fake member-only CRUD resource", async () => {
  const users = await readSource("src/app/(admin)/admin/users/page.tsx");
  assert.match(users, /title="使用者管理"/);
  assert.match(users, /網站帳號與個人基本資料/);
  assert.doesNotMatch(users, /新增使用者/);
  assert.match(users, /尚未填寫/);
});

test("membership management makes the academic-year relationship explicit without a type override", async () => {
  const [page, records, repository] = await Promise.all([
    readSource("src/app/(admin)/admin/memberships/page.tsx"),
    readSource("src/components/(admin)/admin/memberships/MembershipRecords.tsx"),
    readSource("src/repositories/membership-register-keys.repository.ts"),
  ]);
  assert.match(page, /各學年度的社員資格/);
  assert.match(records, /社員類型會依幹部職位紀錄自動重新判定/);
  assert.match(records, /MembershipTypeLabel/);
  assert.doesNotMatch(records, /name="type"/);
  assert.match(repository, /claim_membership_register_key/);
});

test("register keys use register-key terminology and retain revoke rather than delete semantics", async () => {
  const [page, table] = await Promise.all([
    readSource("src/app/(admin)/admin/memberships/register-keys/page.tsx"),
    readSource("src/components/(admin)/admin/memberships/RegisterKeyTable.tsx"),
  ]);
  assert.match(page, /社員註冊序號管理/);
  assert.match(table, /撤銷/);
  assert.match(table, /registerKey\.status === "available"/);
});

test("officer deletion is framed as historical-record removal while authorization remains officer-history based", async () => {
  const [records, service, auth] = await Promise.all([
    readSource("src/components/(admin)/admin/officers/OfficerRecords.tsx"),
    readSource("src/services/officer-positions/officer-positions.service.ts"),
    readSource("src/libs/auth.tsx"),
  ]);
  assert.match(records, /刪除幹部紀錄/);
  assert.match(records, /重新計算相關社員資格類型/);
  assert.match(service, /hasEverBeenOfficer/);
  assert.match(auth, /hasEverBeenOfficer/);
  assert.doesNotMatch(records, /卸任|離職|結束任期/);
});

test("user management keeps account and profile identity separate from membership and officer history", async () => {
  const [list, detail, service, repository] = await Promise.all([
    readSource("src/app/(admin)/admin/users/page.tsx"),
    readSource("src/app/(admin)/admin/users/[id]/page.tsx"),
    readSource("src/services/users/users.service.tsx"),
    readSource("src/repositories/users.repository.ts"),
  ]);

  assert.match(list, /使用者名稱/);
  assert.match(list, /真實姓名/);
  assert.match(list, /尚未填寫/);
  assert.doesNotMatch(list, /社團關係/);
  assert.doesNotMatch(list, /real_name \|\| user\.name/);
  const listForAdmin = service.slice(
    service.indexOf("listForAdmin"),
    service.indexOf("getUserForAdmin"),
  );
  assert.doesNotMatch(listForAdmin, /membershipService\.getUserMembershipEligibility\(userIds\)/);
  assert.doesNotMatch(listForAdmin, /officerPositionsRepository\.findUserIdsByUserIds\(userIds\)/);
  assert.match(service, /userProfilesRepository\.findUserIdsBySearch/);
  assert.match(repository, /userIds\?: string\[\]/);
  assert.match(detail, /社員紀錄/);
  assert.match(detail, /幹部紀錄/);
});
