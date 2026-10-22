import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("contributor ranking migration is opt-in, private-safe and immediately derived", async () => {
  const [migration, canonical, verification] = await Promise.all([
    source("supabase/migrations/202610220003_add_review_contributor_rankings.sql"),
    source("supabase/schema/canonical-public-schema.sql"),
    source("supabase/verification/verify-review-contributor-rankings.sql"),
  ]);
  assert.match(migration, /review_contributor_ranking_opt_in boolean not null default false/);
  assert.match(migration, /security_invoker = true/);
  assert.match(migration, /review\.content is not null[\s\S]*btrim\(review\.content\) <> ''/);
  assert.match(migration, /review_contributor_ranking_opt_in = true[\s\S]*author\.closed_at is null/);
  assert.match(migration, /review_count desc,[\s\S]*received_like_count desc,[\s\S]*latest_review_at desc,[\s\S]*user_id asc/);
  assert.match(migration, /revoke all privileges[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant select[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /update public\.users set|insert into public\.users|delete from public\.users/);
  assert.match(canonical, /create view public\.review_contributor_rankings/);
  assert.match(canonical, /author\.avatar as user_avatar/);
  for (const check of ["column.default_false", "view.security_invoker", "view.only_opted_in_active_authors", "view.contiguous_global_rank"]) assert.match(verification, new RegExp(check.replace(".", "\\.")));
});

test("contributor repository reads only the ranked public projection", async () => {
  const calls = [];
  const builder = {
    select(columns, options) { calls.push(["select", columns, options]); return this; },
    order(column, options) { calls.push(["order", column, options]); return this; },
    async range(from, to) { calls.push(["range", from, to]); return { data: [{ global_rank: 21, user_id: "u", user_name: "公開名稱", user_avatar: "https://example.test/avatar.png", review_count: 3, received_like_count: 2, latest_review_at: "2026-10-22" }], error: null, count: 25 }; },
  };
  const repository = load("src/repositories/review-contributor-rankings.repository.ts", {
    "@/libs/supabase/server": { supabase: { from(table) { calls.push(["from", table]); return builder; } } },
  }).reviewContributorRankingsRepository;
  const result = await repository.findPage({ page: 2, pageSize: 20 });
  assert.deepEqual(calls[0], ["from", "review_contributor_rankings"]);
  assert.match(calls[1][1], /user_name/);
  assert.match(calls[1][1], /user_avatar/);
  assert.doesNotMatch(calls[1][1], /email|real_name|phone|member/);
  assert.deepEqual(calls.at(-1), ["range", 20, 39]);
  assert.equal(result.data[0].global_rank, 21);
});

test("contributor repository returns an empty page instead of surfacing PostgREST range errors", async () => {
  let queryNumber = 0;
  const supabase = { from() {
    queryNumber += 1;
    if (queryNumber === 1) return {
      select() { return this; }, order() { return this; },
      async range() { return { data: null, error: { code: "PGRST103" }, count: null }; },
    };
    return { async select(columns, options) { assert.equal(options.head, true); return { count: 0, error: null }; } };
  } };
  const repository = load("src/repositories/review-contributor-rankings.repository.ts", {
    "@/libs/supabase/server": { supabase },
  }).reviewContributorRankingsRepository;
  const result = await repository.findPage({ page: 2, pageSize: 20 });
  assert.deepEqual(result, { data: [], total: 0, page: 2, pageSize: 20, totalPages: 0 });
});

test("contributor list reuses compact ranking rows, public avatar and aggregates", () => {
  const { ReviewContributorRankingList } = load("src/components/(public)/rankings/ReviewContributorRankingList.tsx");
  const html = renderToStaticMarkup(createElement(ReviewContributorRankingList, { items: [
    { globalRank: 2, user: { id: "user-id", name: "公開名稱", avatar: "https://example.test/avatar.png" }, reviewCount: 4, receivedLikeCount: 7 },
    { globalRank: 3, user: { id: "second-user", name: "第二位玩家", avatar: null }, reviewCount: 2, receivedLikeCount: 1 },
  ] }));
  assert.match(html, /aria-label="第 2 名"/);
  assert.match(html, /href="\/profile\/user-id"/);
  assert.match(html, /4 則有效公開評論/);
  assert.match(html, /累積獲得 7 個讚/);
  assert.match(html, /src="https:\/\/example\.test\/avatar\.png"/);
  assert.match(html, /href="\/profile\/second-user"/);
  assert.match(html, /size-10/);
  assert.doesNotMatch(html, /email|真實姓名|會員狀態/);
});

test("contributor list uses the canonical avatar fallback, truncates long names and avoids nested empty cards", () => {
  const { ReviewContributorRankingList } = load("src/components/(public)/rankings/ReviewContributorRankingList.tsx");
  const longName = "很長的公開顯示名稱".repeat(12);
  const populated = renderToStaticMarkup(createElement(ReviewContributorRankingList, { items: [{ globalRank: 1, user: { id: "fallback-user", name: longName, avatar: null }, reviewCount: 1, receivedLikeCount: 0 }] }));
  assert.match(populated, /<svg[^>]*role="img"/);
  assert.match(populated, /line-clamp-1/);
  const empty = renderToStaticMarkup(createElement(ReviewContributorRankingList, { items: [] }));
  assert.match(empty, /尚無評論貢獻排行資料/);
  assert.match(empty, /border-0/);
  assert.match(empty, /bg-transparent/);
});

test("settings opt-in is explicit, reversible and server-session scoped", async () => {
  const [component, route, schema, privacy, terms] = await Promise.all([
    source("src/components/(authenticated)/settings/PublicProfileSettings.tsx"),
    source("src/app/api/users/me/public-ranking-preference/route.ts"),
    source("src/services/users/users.schema.tsx"),
    source("src/app/(public)/privacy/page.tsx"),
    source("src/app/(public)/terms/page.tsx"),
  ]);
  assert.match(component, /role="switch"/);
  assert.match(component, /隱私與公開設定/);
  assert.match(component, /參與公開個人排行榜/);
  assert.match(component, /api\/users\/me\/profile-visibility/);
  assert.match(component, /value="public"/);
  assert.match(component, /value="limited"/);
  assert.match(component, /開啟後可出現在評論貢獻排行/);
  assert.match(component, /個人檔案可見性不會影響你已發表的公開評論/);
  assert.match(component, /body: \{ optedIn: nextValue \}/);
  assert.match(route, /authorizeVerifiedRequest/);
  assert.doesNotMatch(route, /userId.*request|authorId.*request/);
  assert.match(schema, /optedIn: z\.boolean\(\)/);
  assert.match(privacy, /公開個人排行榜採自願參與/);
  assert.match(terms, /公開個人排行榜為自願參與功能/);
});

test("contributor ranking route, overview and sitemap are discoverable", async () => {
  const [page, overview, sitemap] = await Promise.all([
    source("src/app/(public)/rankings/contributors/page.tsx"),
    source("src/app/(public)/rankings/page.tsx"),
    source("src/app/sitemap.ts"),
  ]);
  assert.match(page, /reviewContributorRankingsService\.list/);
  assert.match(page, /PaginatedCollection/);
  assert.match(page, /basePath="\/rankings\/contributors"/);
  assert.match(overview, /page: 1, pageSize: 3/);
  assert.match(overview, /href="\/rankings\/contributors"/);
  assert.match(sitemap, /"\/rankings\/contributors"/);
});
