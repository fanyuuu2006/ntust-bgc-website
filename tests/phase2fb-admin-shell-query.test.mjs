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
    readSource("src/components/(admin)/admin/ClearableSearchInput.tsx"),
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

test("sidebar retains the approved IA and keeps long labels readable", async () => {
  const [navigation, sidebar] = await Promise.all([
    readSource("src/libs/navigation.tsx"),
    readSource("src/components/(admin)/AdminSidebarNav.tsx"),
  ]);

  assert.match(navigation, /桌遊借用管理/);
  assert.match(navigation, /社員註冊序號管理/);
  assert.match(navigation, /社團內容/);
  assert.doesNotMatch(sidebar, /block truncate rounded-lg/);
});

test("unused generic admin record wrappers are removed instead of becoming a framework", async () => {
  await assert.rejects(access(new URL("../src/components/(admin)/admin/AdminManagementList.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../src/components/(admin)/admin/AdminMobileRecord.tsx", import.meta.url)));
});
