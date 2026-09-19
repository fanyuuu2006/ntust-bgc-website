import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_REFERENCE_DATE,
  buildFixture,
  formatPlan,
  parseArguments,
  parseDevelopmentTarget,
  planFixture,
} from "../scripts/development-qa-fixture.mjs";

const DEV = "https://mrsyfssstigartmhofuz.supabase.co";

function emptyState() {
  return {
    users: [{ id: "00000000-0000-4000-8000-000000000001", email: "maintainer@development.invalid", name: "Maintainer", email_verified_at: "2026-09-18T00:00:00.000Z", closed_at: null, avatar: null }],
    user_profiles: [], auth_credentials: [],
    academic_years: [{ id: "00000000-0000-4000-8000-000000000115", year: "115", start_date: "2026-09-07", end_date: "2027-09-05", is_current: false }],
    officer_positions: [{ id: "00000000-0000-4000-8000-000000000002", user_id: "00000000-0000-4000-8000-000000000001", academic_year_id: "00000000-0000-4000-8000-000000000115", title: "神" }],
    memberships: [], board_game_categories: [], board_game_locations: [], board_games: [], board_game_reviews: [], board_game_borrowings: [], events: [], event_attendances: [], announcements: [],
  };
}

test("target guard accepts only exact Development URL", () => {
  assert.equal(parseDevelopmentTarget(DEV), "mrsyfssstigartmhofuz");
  for (const value of ["https://gcydchpuckbmctcjpokz.supabase.co", "https://unknown.supabase.co", "http://127.0.0.1:54321", "not-a-url", `${DEV}/rest`, `${DEV}?x=1`, `${DEV}#x`, "https://user:pass@mrsyfssstigartmhofuz.supabase.co"]) assert.throws(() => parseDevelopmentTarget(value));
});

test("CLI requires confirmation and a real reference date", () => {
  assert.deepEqual(parseArguments(["--reference-date", CANONICAL_REFERENCE_DATE, "--confirm-development", "--dry-run"]), { referenceDate: CANONICAL_REFERENCE_DATE, confirmDevelopment: true, dryRun: true });
  assert.throws(() => parseArguments(["--reference-date", CANONICAL_REFERENCE_DATE]));
  assert.throws(() => parseArguments(["--confirm-development", "--reference-date", "2026-02-30"]));
  assert.throws(() => parseArguments(["--confirm-development", "--reference-date", CANONICAL_REFERENCE_DATE, "extra"]));
});

test("fixture is QA-case-driven and respects domain invariants", () => {
  const fixture = buildFixture();
  assert.equal(fixture.games.length, 25);
  assert.deepEqual(new Set(fixture.games.map((game) => game.status)), new Set(["available", "borrowed", "maintenance", "lost", "damaged", "retired"]));
  assert.equal(new Set(fixture.reviews.map((review) => `${review.user_id}:${review.board_game_id}`)).size, fixture.reviews.length);
  assert.ok(fixture.reviews.filter((review) => review.board_game_id === fixture.games[0].id).length > 10);
  assert.ok(fixture.reviews.filter((review) => review.user_id === "$actor").length > 10);
  assert.deepEqual(new Set(fixture.borrowings.map((item) => item.status)), new Set(["pending", "approved", "rejected", "borrowed", "returned", "cancelled"]));
  assert.deepEqual(new Set(fixture.attendances.map((item) => item.status)), new Set(["present", "late", "absent"]));
  assert.equal(new Set(fixture.attendances.map((item) => `${item.event_id}:${item.user_id}`)).size, fixture.attendances.length);
  assert.ok(fixture.announcements.some((item) => item.is_published));
  assert.ok(fixture.announcements.some((item) => !item.is_published && item.published_at === null));
});

test("clean Development plan preserves bootstrap Admin and plans fixture", () => {
  const fixture = buildFixture();
  const plan = planFixture(fixture, emptyState(fixture));
  assert.equal(plan.totals.users.create, 20);
  assert.equal(plan.totals.board_games.create, 25);
  assert.equal(plan.totals.board_game_reviews.create, 21);
  assert.equal(plan.plans.board_game_reviews.create.filter((review) => review.user_id === plan.actorId).length, 11);
  assert.equal(plan.plans.board_game_borrowings.create.filter((borrowing) => borrowing.user_id === plan.actorId).length, 11);
  assert.equal(plan.totals.board_game_borrowings.create, 21);
  assert.equal(plan.totals.current_academic_year.create, 1);
  assert.ok(!fixture.memberships.some((item) => item.user_id === plan.actorId));
});

test("partial fixture reuses exact rows and rejects conflicting identity", () => {
  const fixture = buildFixture();
  const state = emptyState(fixture);
  state.users.push({ ...fixture.users[0], profile: undefined });
  assert.equal(planFixture(fixture, state).totals.users.reuse, 1);
  state.users.at(-1).name = "unexpected";
  assert.throws(() => planFixture(fixture, state), /Conflicting users/);
});

test("partially created fixture user can resume canonical verification", () => {
  const fixture = buildFixture();
  const state = emptyState();
  const pending = { ...fixture.users[0], email_verified_at: null };
  delete pending.profile;
  state.users.push(pending);
  const plan = planFixture(fixture, state);
  assert.equal(plan.totals.users.reuse, 1);
  assert.equal(plan.totals.verifications.create, 18);
});

test("planner rejects conflicting membership, Officer, and borrowing lifecycle identities", () => {
  const fixture = buildFixture();
  const state = emptyState(fixture);
  const currentYear = state.academic_years[0];
  state.memberships.push({ ...fixture.memberships[0], academic_year_id: currentYear.id, status: "cancelled" });
  assert.throws(() => planFixture(fixture, state), /Conflicting memberships/);
  state.memberships = [];
  state.officer_positions.push({ user_id: fixture.officers[1].user_id, academic_year_id: currentYear.id, title: "unexpected" });
  assert.throws(() => planFixture(fixture, state), /Conflicting officer_positions/);
  state.officer_positions.pop();
  state.board_game_borrowings.push({ ...fixture.borrowings[0], user_id: state.users[0].id, approved_by_user_id: state.users[0].id, status: "returned" });
  assert.throws(() => planFixture(fixture, state), /Conflicting board_game_borrowings/);
});

test("fully represented fixture is a no-op", () => {
  const fixture = buildFixture();
  const state = emptyState(fixture);
  state.academic_years[0].is_current = true;
  state.users.push(...fixture.users.map((user) => ({
    id: user.id, email: user.email, name: user.name,
    email_verified_at: user.email_verified_at, closed_at: user.closed_at,
    avatar: user.avatar,
  })));
  state.user_profiles.push(...fixture.users.filter((user) => user.profile).map((user) => ({ user_id: user.id, ...user.profile })));
  state.auth_credentials.push(...fixture.users.filter((user) => !user.closed_at).map((user) => ({ user_id: user.id })));
  state.academic_years.push(...fixture.years);
  state.board_game_categories.push(...fixture.categories);
  state.board_game_locations.push(...fixture.locations);
  state.board_games.push(...fixture.games);
  const year = (identifier) => identifier === "115" ? state.academic_years[0] : fixture.years.find((item) => item.year === identifier);
  state.officer_positions.push(...fixture.officers.map((item) => ({ ...item, academic_year_id: year(item.academic_year).id })));
  state.memberships.push(...fixture.memberships.map((item) => ({ ...item, academic_year_id: year(item.academic_year).id })));
  state.board_game_reviews.push(...fixture.reviews.map((item) => ({ ...item, user_id: item.user_id === "$actor" ? state.users[0].id : item.user_id })));
  state.board_game_borrowings.push(...fixture.borrowings.map((item) => ({ ...item, user_id: item.user_id === "$actor" ? state.users[0].id : item.user_id, approved_by_user_id: item.approved_by_actor ? state.users[0].id : null })));
  state.events.push(...fixture.events);
  state.event_attendances.push(...fixture.attendances);
  state.announcements.push(...fixture.announcements.map((item) => ({ ...item, author_id: state.users[0].id })));
  const plan = planFixture(fixture, state);
  assert.equal(Object.values(plan.totals).reduce((sum, item) => sum + item.create, 0), 0);
  assert.match(formatPlan(fixture, plan, true), /Total to create: 0/);
});

test("planner fails closed for missing or ambiguous bootstrap actor", () => {
  const fixture = buildFixture();
  const missing = emptyState(fixture); missing.officer_positions = [];
  assert.throws(() => planFixture(fixture, missing), /exactly one/);
  const ambiguous = emptyState(fixture);
  ambiguous.users.push({ id: "00000000-0000-4000-8000-000000000003", email: "second@development.invalid", name: "Second", email_verified_at: "2026-09-18T00:00:00.000Z", closed_at: null, avatar: null });
  ambiguous.officer_positions.push({ id: "x", user_id: ambiguous.users[1].id, academic_year_id: ambiguous.academic_years[0].id, title: "Officer" });
  assert.throws(() => planFixture(fixture, ambiguous), /exactly one/);
});

test("plan output contains aggregates only and no sensitive fields", () => {
  const fixture = buildFixture();
  const output = formatPlan(fixture, planFixture(fixture, emptyState(fixture)), true);
  assert.doesNotMatch(output, /password|token|secret|authorization|maintainer@/i);
  assert.match(output, /Mode: dry-run/);
});
