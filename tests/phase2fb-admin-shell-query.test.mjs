import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("AdminShell remains the only admin main landmark and the segment layout adds no wrapper", async () => {
  const [shell, layout] = await Promise.all([
    readSource("src/components/layouts/AdminShell.tsx"),
    readSource("src/app/(admin)/admin/layout.tsx"),
  ]);

  assert.match(shell, /<main /);
  assert.equal((shell.match(/<main/g) ?? []).length, 1);
  assert.match(layout, /return children/);
  assert.doesNotMatch(layout, /<main|<div|<section/);
});

test("admin query and result shells keep their distinct surface responsibilities", async () => {
  const [toolbar, listSection] = await Promise.all([
    readSource("src/components/(admin)/admin/AdminToolbar.tsx"),
    readSource("src/components/(admin)/admin/AdminListSection.tsx"),
  ]);

  assert.doesNotMatch(toolbar, /\bcard\b|bg-\(/);
  assert.match(listSection, /import \{ Card \}/);
  assert.match(listSection, /<Card/);
  assert.doesNotMatch(listSection, /className=\{cn\("card/);
});

test("admin controls use Lucide affordances and keep explicit focus ownership", async () => {
  const [search, sortHeader, select, header, modal] = await Promise.all([
    readSource("src/components/query/ClearableSearchInput.tsx"),
    readSource("src/components/(admin)/admin/SortableTableHeader.tsx"),
    readSource("src/components/ui/Select.tsx"),
    readSource("src/components/(admin)/AdminHeader.tsx"),
    readSource("src/components/Modal.tsx"),
  ]);

  assert.match(search, /import \{ X \} from "lucide-react"/);
  assert.match(sortHeader, /ArrowUpDown/);
  assert.match(header, /import \{ Menu \} from "lucide-react"/);
  assert.match(select, /focusOwner = "self"/);
  assert.match(modal, /previouslyFocusedElement/);
  assert.match(modal, /trigger\.focus\(\)/);
});

test("sidebar retains the approved domain grouping and item order", async () => {
  const [navigation, sidebar] = await Promise.all([
    readSource("src/libs/navigation.tsx"),
    readSource("src/components/(admin)/AdminSidebarNav.tsx"),
  ]);

  const expectedGroups = [
    ["總覽", [["儀表板", "/admin"]]],
    ["桌遊管理", [
      ["桌遊管理", "/admin/board-games"],
      ["桌遊借用管理", "/admin/board-games/borrowings"],
      ["評價與評論管理", "/admin/reviews"],
      ["桌遊購入建議", "/admin/board-games/suggests"],
      ["桌遊種類管理", "/admin/board-games/categories"],
      ["桌遊位置管理", "/admin/board-games/locations"],
    ]],
    ["人員與社員", [
      ["使用者管理", "/admin/users"],
      ["社員資格管理", "/admin/memberships"],
      ["社員註冊序號管理", "/admin/memberships/register-keys"],
      ["幹部管理", "/admin/officers"],
      ["學年度管理", "/admin/academic-years"],
    ]],
    ["活動與內容", [
      ["活動管理", "/admin/events"],
      ["公告管理", "/admin/announcements"],
    ]],
  ];

  let previousGroupIndex = -1;
  for (const [groupLabel, items] of expectedGroups) {
    const groupIndex = navigation.indexOf(`label: "${groupLabel}"`, previousGroupIndex + 1);
    assert.ok(groupIndex > previousGroupIndex, `${groupLabel} group order`);
    previousGroupIndex = groupIndex;

    let previousItemIndex = groupIndex;
    for (const [label, href] of items) {
      const itemIndex = navigation.indexOf(
        `{ label: "${label}", href: "${href}" }`,
        previousItemIndex,
      );
      assert.ok(itemIndex > previousItemIndex, `${groupLabel}: ${label} order`);
      previousItemIndex = itemIndex;
    }
  }
  assert.match(sidebar, /adminSidebarGroups\.map/);
  assert.match(sidebar, /onClick=\{onNavigate\}/);
  assert.match(sidebar, /aria-current=\{active \? "page" : undefined\}/);
  assert.doesNotMatch(sidebar, /block truncate rounded-lg/);
});

test("unused generic admin record wrappers are removed instead of becoming a framework", async () => {
  await assert.rejects(access(new URL("../src/components/(admin)/admin/AdminManagementList.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../src/components/(admin)/admin/AdminMobileRecord.tsx", import.meta.url)));
});
