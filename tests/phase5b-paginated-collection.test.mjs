import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("PaginatedCollection composes orientation, records and controls without owning queries", () => {
  function Summary() {}
  function Controls() {}
  const { PaginatedCollection } = load(
    "src/components/Pagination/PaginatedCollection.tsx",
    {
      "@/components/Pagination/Pagination": { Pagination: Controls },
      "@/components/Pagination/PaginationSummary": { PaginationSummary: Summary },
      "@/utils/className": { cn: (...values) => values.filter(Boolean).join(" ") },
    },
  );
  const query = { search: "strategy", status: "available" };
  const rendered = PaginatedCollection({
    page: 2,
    pageSize: 20,
    total: 25,
    totalPages: 2,
    basePath: "/things",
    query,
    itemLabel: "款桌遊",
    children: "records",
  });
  const [summary, records, controls] = rendered.props.children;

  assert.equal(summary.type, Summary);
  assert.deepEqual(
    { page: summary.props.page, pageSize: summary.props.pageSize, total: summary.props.total, totalPages: summary.props.totalPages, unit: summary.props.unit },
    { page: 2, pageSize: 20, total: 25, totalPages: 2, unit: "款桌遊" },
  );
  assert.equal(records, "records");
  assert.equal(controls.type, Controls);
  assert.equal(controls.props.basePath, "/things");
  assert.deepEqual(controls.props.query, query);

  const customSummary = { type: "review-summary" };
  const customized = PaginatedCollection({
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
    basePath: "/reviews",
    query: {},
    summary: customSummary,
    children: "review records",
  });
  assert.equal(customized.props.children[0], customSummary);
  assert.equal(customized.props.children[1], "review records");
});

test("collection pages converge while Review collections supply their specialized summaries", async () => {
  const migrated = [
    "src/app/(public)/announcements/page.tsx",
    "src/app/(public)/board-games/page.tsx",
    "src/components/(authenticated)/borrowings/BorrowingsResults.tsx",
    "src/components/(authenticated)/memberships/MembershipRecordsResults.tsx",
    "src/app/(admin)/admin/users/page.tsx",
    "src/app/(admin)/admin/memberships/page.tsx",
    "src/app/(admin)/admin/memberships/register-keys/page.tsx",
    "src/app/(admin)/admin/officers/page.tsx",
    "src/app/(admin)/admin/board-games/page.tsx",
    "src/app/(admin)/admin/board-games/borrowings/page.tsx",
    "src/app/(admin)/admin/board-games/categories/page.tsx",
    "src/app/(admin)/admin/board-games/locations/page.tsx",
    "src/app/(admin)/admin/events/page.tsx",
    "src/app/(admin)/admin/events/[id]/page.tsx",
    "src/app/(admin)/admin/announcements/page.tsx",
    "src/app/(admin)/admin/reviews/page.tsx",
    "src/app/(admin)/admin/academic-years/page.tsx",
  ];
  for (const path of migrated) {
    const content = await source(path);
    assert.equal((content.match(/<PaginatedCollection\b/g) ?? []).length, 1, path);
    assert.doesNotMatch(content, /<Pagination\b/, path);
  }

  for (const path of [
    "src/components/(public)/board-games/BoardGameReviews.tsx",
    "src/components/(public)/profile/ProfileReviewCollection.tsx",
  ]) {
    const content = await source(path);
    assert.match(content, /ReviewResultSummary/);
    assert.match(content, /<PaginatedCollection\b/);
    assert.match(content, /summary=\{<ReviewResultSummary/);
    assert.match(content, /pageKey="reviewPage"/);
    assert.doesNotMatch(content, /<Pagination\b/);
  }
});

test("own and public Profile Reviews share the same paginated collection", async () => {
  const [own, publicPage, collection] = await Promise.all([
    source("src/components/(authenticated)/profile/MyProfileReviews.tsx"),
    source("src/app/(public)/profile/[id]/page.tsx"),
    source("src/components/(public)/profile/ProfileReviewCollection.tsx"),
  ]);
  assert.match(own, /ProfileReviewCollection/);
  assert.match(own, /basePath=\{BASE_PATH\}/);
  assert.match(publicPage, /ProfileReviewCollection/);
  assert.match(publicPage, /basePath=\{`\/profile\/\$\{identity\.id\}`\}/);
  assert.match(collection, /query=\{appliedQuery\}/);
  assert.match(collection, /pageKey="reviewPage"/);
});

test("Admin Board Game names link to public details without replacing edit or delete", async () => {
  const content = await source(
    "src/components/(admin)/admin/board-games/BoardGameTable.tsx",
  );
  assert.equal((content.match(/href=\{`\/board-games\/\$\{game\.id\}`\}/g) ?? []).length, 2);
  assert.match(content, /\/admin\/board-games\/\$\{boardGame\.id\}\/edit/);
  assert.match(content, /variant="danger"/);
  assert.doesNotMatch(content, /<TableRow[^>]*href=/);
});
