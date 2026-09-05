import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("PageHeader remains a generic application-page composition with member consumers", async () => {
  const [pageHeader, announcements, borrowings, memberships] = await Promise.all([
    readSource("src/components/PageHeader.tsx"),
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
    readSource("src/app/(authenticated)/memberships/page.tsx"),
  ]);

  assert.match(pageHeader, /title:\s*string/);
  assert.match(pageHeader, /description\?:\s*React\.ReactNode/);
  assert.match(pageHeader, /actions\?:\s*React\.ReactNode/);
  assert.match(pageHeader, /sm:flex-row/);
  assert.doesNotMatch(pageHeader, /Membership|Borrowing|BoardGame|Officer/);

  for (const source of [announcements, borrowings, memberships]) {
    assert.match(source, /@\/components\/PageHeader/);
    assert.match(source, /<PageHeader/);
  }
});

test("Button defaults preserve safe form behavior and stable loading layout", async () => {
  const source = await readSource("src/components/ui/Button.tsx");

  assert.match(source, /type\s*=\s*"button"/);
  assert.match(source, /aria-busy=\{isLoading \|\| undefined\}/);
  assert.match(source, /size\s*=\s*"md"/);
  assert.match(source, /opacity-0/);
});

test("EmptyState supports optional icon, action, and compact presentation", async () => {
  const source = await readSource("src/components/ui/EmptyState.tsx");

  assert.match(source, /icon\?:\s*React\.ReactNode/);
  assert.match(source, /action\?:\s*React\.ReactNode/);
  assert.match(source, /compact\?:\s*boolean/);
  assert.match(source, /action \?\? children/);
});

test("member search and filter controls use canonical shared UI primitives", async () => {
  const [searchInput, announcements, borrowings] = await Promise.all([
    readSource("src/components/query/ClearableSearchInput.tsx"),
    readSource("src/app/(public)/announcements/page.tsx"),
    readSource("src/app/(authenticated)/borrowings/page.tsx"),
  ]);

  assert.match(searchInput, /@\/components\/ui\/Input/);
  assert.match(announcements, /@\/components\/query\/ClearableSearchInput/);
  assert.match(announcements, /@\/components\/ui\/Button/);
  assert.match(borrowings, /@\/components\/ui\/Select/);
  assert.match(borrowings, /<Select/);
  assert.match(borrowings, /<Button type="submit"/);
});

test("obsolete decorative CSS contracts are removed", async () => {
  const source = await readSource("src/styles/globals.css");

  assert.doesNotMatch(source, /\.game-block/);
  assert.doesNotMatch(source, /\.tooltip/);
  assert.doesNotMatch(source, /\.overlay-wrapper/);
});
