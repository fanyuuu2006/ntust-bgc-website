import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("website Header stays in document flow while remaining sticky above page content", async () => {
  const header = await readSource("src/components/Header/Header.tsx");

  assert.match(header, /sticky[^"\n]*top-0[^"\n]*z-40/);
  assert.match(header, /border-b[^"\n]*bg-\(--surface-default\)/);
  assert.doesNotMatch(header, /\bfixed\b/);
});

test("AdminHeader has a shared height contract and AdminShell keeps document scrolling", async () => {
  const [header, shell] = await Promise.all([
    readSource("src/components/(admin)/AdminHeader.tsx"),
    readSource("src/components/layouts/AdminShell.tsx"),
  ]);

  assert.match(header, /\bh-14\b/);
  assert.match(shell, /className="sticky[^"\n]*top-0[^"\n]*z-40/);
  assert.match(shell, /className="flex[^"\n]*min-h-dvh[^"\n]*flex-col"/);
  assert.doesNotMatch(shell, /className="flex h-dvh|overflow-hidden/);

  const main = shell.match(/<main className="([^"]+)"/);
  assert.ok(main, "AdminShell should keep one explicit main landmark");
  assert.doesNotMatch(main[1], /overflow(?:-y)?-auto/);
});

test("AdminShell resists root-body flex shrinking so long Main content extends the Header sticky boundary", async () => {
  const [globals, adminLayout, shell] = await Promise.all([
    readSource("src/styles/globals.css"),
    readSource("src/app/(admin)/layout.tsx"),
    readSource("src/components/layouts/AdminShell.tsx"),
  ]);

  assert.match(
    globals,
    /body\s*\{[\s\S]*?height:\s*100%;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/,
  );
  assert.match(adminLayout, /return <AdminShell user=\{user\}>\{children\}<\/AdminShell>/);
  assert.match(
    shell,
    /className="flex[^"\n]*min-h-dvh[^"\n]*shrink-0[^"\n]*flex-col"/,
  );
  assert.match(shell, /className="flex flex-1"/);
});

test("desktop Sidebar is viewport-aware while only its navigation region scrolls", async () => {
  const sidebar = await readSource(
    "src/components/(admin)/AdminSidebar.tsx",
  );

  assert.match(sidebar, /lg:sticky/);
  assert.match(sidebar, /lg:top-14/);
  assert.match(sidebar, /lg:self-start/);
  assert.match(sidebar, /lg:z-30/);
  assert.match(sidebar, /lg:h-\[calc\(100dvh-3\.5rem\)\]/);
  assert.doesNotMatch(sidebar, /max-h-screen/);
  assert.match(
    sidebar,
    /className="min-h-0 flex-1 overflow-y-auto"[\s\S]*?<AdminSidebarNav/,
  );
});

test("mobile Sidebar remains a fixed viewport drawer above its backdrop", async () => {
  const sidebar = await readSource(
    "src/components/(admin)/AdminSidebar.tsx",
  );

  assert.match(sidebar, /fixed inset-0 z-40[^"\n]*lg:hidden/);
  assert.match(sidebar, /fixed inset-y-0 left-0 z-50/);
  assert.match(sidebar, /flex h-dvh w-72 flex-col/);
});
