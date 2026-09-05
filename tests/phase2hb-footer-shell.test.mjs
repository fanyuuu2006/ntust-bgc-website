import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const readSource = (path) => readFile(new URL(path, root), "utf8");

test("full Footer exposes the confirmed identity, website, contact, related, and legal information", async () => {
  const footerPath = "src/components/Footer/Footer.tsx";
  await access(new URL(footerPath, root));
  const footer = await readSource(footerPath);

  assert.match(footer, /variant\??:\s*"full"\s*\|\s*"legal"/);
  assert.match(footer, /siteConfigs\.name/);
  assert.match(footer, /siteConfigs\.fullName/);
  assert.ok(footer.includes("\u7db2\u7ad9\u5c0e\u89bd"));
  assert.match(footer, /publicNavigation\.map/);
  assert.ok(footer.includes("\u806f\u7d61\u8cc7\u8a0a"));
  assert.match(footer, /href="mailto:ntustboardgame@gmail\.com"/);
  assert.ok(footer.includes("ntustboardgame@gmail.com"));
  assert.match(footer, /href="https:\/\/www\.instagram\.com\/ntust_boardgame\/"/);
  assert.ok(footer.includes("Instagram"));
  assert.ok(footer.includes("\u76f8\u95dc\u9023\u7d50"));
  assert.match(footer, /href="https:\/\/www\.ntust\.edu\.tw\/"/);
  assert.ok(footer.includes("\u81fa\u79d1\u5927\u5b98\u7db2"));
  assert.ok(footer.includes("\u96b1\u79c1\u6b0a\u653f\u7b56"));
  assert.ok(footer.includes("\u4f7f\u7528\u689d\u6b3e"));
  assert.doesNotMatch(footer, /<Image|siteConfigs\.logo/);
  assert.doesNotMatch(
    footer,
    /memberMenuNavigation|adminNavigation|\/dashboard|\/admin|GitHub|Facebook|\u7248\u672c|version/i,
  );
});

test("Footer variants retain semantic navigation while legal mode stays a compact server-rendered branch", async () => {
  const footer = await readSource("src/components/Footer/Footer.tsx");
  const legalStart = footer.indexOf('if (variant === "legal")');
  const fullStart = footer.indexOf("\n  return (", legalStart);
  const legalBranch = footer.slice(legalStart, fullStart);

  assert.match(footer, /<footer/);
  assert.ok(footer.includes('aria-label="\u7db2\u7ad9\u5c0e\u89bd"'));
  assert.ok(footer.includes('aria-label="\u76f8\u95dc\u9023\u7d50"'));
  assert.ok(footer.includes('aria-label="\u6cd5\u5f8b\u8cc7\u8a0a"'));
  assert.match(footer, /variant === "legal"/);
  assert.match(footer, /new Date\(\)\.getFullYear\(\)/);
  assert.match(legalBranch, /legalNavigation\.map/);
  assert.match(legalBranch, /siteConfigs\.name/);
  assert.doesNotMatch(
    legalBranch,
    /ntustboardgame@gmail\.com|Instagram|www\.ntust\.edu\.tw|publicNavigation|siteConfigs\.fullName/,
  );
  assert.doesNotMatch(footer, /"use client"|useUser|usePathname|getCurrentUser/);
});

test("full Footer keeps mobile groups stacked and gives identity more room only on desktop", async () => {
  const footer = await readSource("src/components/Footer/Footer.tsx");

  assert.match(
    footer,
    /className="grid[^"\n]*lg:grid-cols-\[minmax\(0,1\.5fr\)_repeat\(3,minmax\(0,1fr\)\)\]/,
  );
  assert.doesNotMatch(footer, /\bgrid-cols-4\b|\bsm:grid-cols-/);
  assert.match(
    footer,
    /border-t[^"\n]*pt-4[^"\n]*flex[^"\n]*flex-col[^"\n]*sm:flex-row/,
  );
  assert.match(footer, /inline-flex min-h-10 items-center/);
});

test("full Footer expresses brand, group, link, and quiet utility text as distinct levels", async () => {
  const footer = await readSource("src/components/Footer/Footer.tsx");

  assert.match(
    footer,
    /className="[^"\n]*text-base[^"\n]*font-semibold[^"\n]*text-\(--text-primary\)"[\s\S]*?siteConfigs\.name/,
  );
  assert.match(
    footer,
    /className="[^"\n]*text-sm[^"\n]*font-semibold[^"\n]*text-\(--text-primary\)"/,
  );
  assert.match(
    footer,
    /className="[^"\n]*text-sm[^"\n]*text-\(--text-secondary\)[^"\n]*hover:text-\(--interactive-primary\)"/,
  );
  assert.match(
    footer,
    /border-t[^"\n]*text-sm[^"\n]*text-\(--text-muted\)[^"\n]*sm:flex-row/,
  );
});

test("WebsiteShell owns a non-shrinking full-height document-flow column with a normal-flow Footer", async () => {
  const [shell, footer] = await Promise.all([
    readSource("src/components/layouts/WebsiteShell.tsx"),
    readSource("src/components/Footer/Footer.tsx"),
  ]);

  assert.match(
    shell,
    /className="flex[^"\n]*min-h-dvh[^"\n]*shrink-0[^"\n]*flex-col"/,
  );
  assert.match(shell, /<Header[\s\S]*?<main[\s\S]*?<Footer/);
  assert.match(shell, /<main[^>]*className="[^"\n]*min-w-0[^"\n]*flex-1/);
  assert.doesNotMatch(shell, /overflow-hidden|overflow-y-auto|(?<!min-)h-dvh/);
  assert.doesNotMatch(footer, /className="[^"\n]*(?:fixed|sticky)/);
});

test("public and authenticated layouts use the full Footer, auth uses legal, and Admin remains excluded", async () => {
  const [publicLayout, authenticatedLayout, authLayout, adminLayout, adminShell] =
    await Promise.all([
      readSource("src/app/(public)/layout.tsx"),
      readSource("src/app/(authenticated)/layout.tsx"),
      readSource("src/app/(auth)/layout.tsx"),
      readSource("src/app/(admin)/layout.tsx"),
      readSource("src/components/layouts/AdminShell.tsx"),
    ]);

  for (const layout of [publicLayout, authenticatedLayout]) {
    assert.match(layout, /<WebsiteShell/);
    assert.doesNotMatch(layout, /footerVariant="legal"/);
  }
  assert.match(authLayout, /<WebsiteShell[^>]*footerVariant="legal"/);
  assert.doesNotMatch(adminLayout, /WebsiteShell|Footer/);
  assert.doesNotMatch(adminShell, /Footer/);
});

test("WebsiteShell integration preserves the existing sticky Header and skip-link landmark contract", async () => {
  const [shell, header] = await Promise.all([
    readSource("src/components/layouts/WebsiteShell.tsx"),
    readSource("src/components/Header/Header.tsx"),
  ]);

  assert.match(shell, /href="#main-content"/);
  assert.match(shell, /id="main-content"/);
  assert.match(header, /sticky[^"\n]*top-0[^"\n]*z-40/);
  assert.match(header, /bg-\(--surface-default\)/);
});
