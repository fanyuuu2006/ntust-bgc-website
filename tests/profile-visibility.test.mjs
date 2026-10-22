import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { load } from "./helpers/load-app-module.mjs";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");
const id = "00000000-0000-4000-8000-000000000001";

function setupVisibility(visibility, closedAt = null) {
  let summaryCalls = 0;
  const publicIdentityService = load("src/services/users/public-identity.service.ts", {
    "@/repositories/public-identities.repository": {
      publicIdentitiesRepository: {
        findById: async () => ({ id, name: "公開名稱", avatar: null, closed_at: closedAt, profile_visibility: visibility }),
      },
    },
    "@/services/profile/public-profile-summary.service": {
      publicProfileSummaryService: {
        getSummary: async () => {
          summaryCalls += 1;
          return { identityBadges: [{ label: "社員", category: "current-membership" }], clubFootprint: { totalBorrowedCount: 2, attendedCount: 3, joinedAcademicYear: "115" } };
        },
      },
    },
  }).publicIdentityService;
  return { publicIdentityService, summaryCalls: () => summaryCalls };
}

test("profile visibility migration preserves existing public behavior without touching ranking opt-in", async () => {
  const [migration, canonical, verification, contributorView] = await Promise.all([
    source("supabase/migrations/202610220005_add_profile_visibility.sql"),
    source("supabase/schema/canonical-public-schema.sql"),
    source("supabase/verification/verify-profile-visibility.sql"),
    source("supabase/migrations/202610220004_add_review_contributor_ranking_avatars.sql"),
  ]);
  assert.match(migration, /profile_visibility as enum \('public', 'limited'\)/);
  assert.match(migration, /profile_visibility public\.profile_visibility not null default 'public'/);
  assert.doesNotMatch(migration, /update public\.users|review_contributor_ranking_opt_in/);
  assert.match(canonical, /profile_visibility as enum \('public', 'limited'\)/);
  assert.match(verification, /enum\.values/);
  assert.match(verification, /column\.default_public/);
  assert.doesNotMatch(contributorView, /profile_visibility/);
});

test("limited profile stops summary queries while public keeps the existing summary", async () => {
  const limited = setupVisibility("limited");
  const limitedProfile = await limited.publicIdentityService.findProfileById(id);
  assert.equal(limited.summaryCalls(), 0);
  assert.deepEqual(limitedProfile, {
    identity: { id, name: "公開名稱", avatar: null },
    visibility: "limited",
    identityBadges: [],
    clubFootprint: null,
  });

  const visible = setupVisibility("public");
  const publicProfile = await visible.publicIdentityService.findProfileById(id);
  assert.equal(visible.summaryCalls(), 1);
  assert.equal(publicProfile.visibility, "public");
  assert.equal(publicProfile.clubFootprint.totalBorrowedCount, 2);
});

test("closed account wins over profile visibility and never loads details", async () => {
  const closed = setupVisibility("public", "2026-10-22T00:00:00.000Z");
  const profile = await closed.publicIdentityService.findProfileById(id);
  assert.equal(closed.summaryCalls(), 0);
  assert.equal(profile.visibility, "closed");
  assert.equal(profile.identity.name, "已註銷使用者");
});

test("visibility API is session-bound, strict, and separate from ranking preference", async () => {
  const [route, schema, service, repository, settings] = await Promise.all([
    source("src/app/api/users/me/profile-visibility/route.ts"),
    source("src/services/users/users.schema.tsx"),
    source("src/services/users/users.service.tsx"),
    source("src/repositories/users.repository.ts"),
    source("src/components/(authenticated)/settings/PublicProfileSettings.tsx"),
  ]);
  assert.match(route, /authorizeVerifiedRequest/);
  assert.match(route, /authorization\.user\.id/);
  assert.doesNotMatch(route, /userId.*request|authorId.*request/);
  assert.match(schema, /visibility: z\.enum\(\["public", "limited"\]\)/);
  assert.match(service, /updateProfileVisibility/);
  assert.match(repository, /\.is\("closed_at", null\)/);
  assert.match(settings, /隱私與公開設定/);
  assert.match(settings, /<option value="public">公開<\/option>/);
  assert.match(settings, /<option value="limited">限制<\/option>/);
  assert.match(settings, /visibility === "public"[\s\S]*其他人可查看你的公開身份、社團足跡與評論紀錄/);
  assert.match(settings, /其他人只能查看你的顯示名稱與頭像/);
  assert.match(settings, /個人檔案可見性不會影響你已發表的公開評論/);
  assert.match(settings, /body: \{ visibility: nextValue \}/);
  assert.match(settings, /setVisibility\(previous\)/);
  assert.match(settings, /body: \{ optedIn: nextValue \}/);
});

test("limited profiles are noindexed, omit structured details, and stay out of sitemap", async () => {
  const [page, seo] = await Promise.all([
    source("src/app/(public)/profile/[id]/page.tsx"),
    source("src/repositories/seo.repository.ts"),
  ]);
  assert.match(page, /visibility !== "public"/);
  assert.match(page, /visibility === "public" \? \(/);
  assert.match(page, /已限制個人檔案的公開內容/);
  assert.match(page, /reviews = visibility !== "public"/);
  assert.match(seo, /\.eq\("profile_visibility", "public"\)/);
});
