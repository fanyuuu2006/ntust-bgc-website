import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, buildSeedEvents } from "../scripts/seed-development-events.mjs";

test("DEV/QA seed dataset is deterministic and covers required scenarios", () => {
  const first = buildSeedEvents();
  const second = buildSeedEvents();
  assert.equal(first.length, 122);
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((event) => event.id)).size, first.length);
  assert.equal(first.filter((event) => event.publication_status === "published").length, 110);
  assert.equal(first.filter((event) => event.publication_status === "draft").length, 12);
  assert.equal(first.filter((event) => event.cancelled_at).length, 7);
  assert.equal(first.filter((event) => event.description_format === "rich_text_v1").length, 31);
  assert.equal(first.filter((event) => event.check_in_opens_at).length, 21);
  assert.equal(first.filter((event) => event.start_time.slice(0, 4) === "2025").length > 0, true);
  assert.equal(first.filter((event) => event.start_time.slice(0, 4) === "2026").length > 0, true);
  assert.equal(first.filter((event) => event.start_time.slice(0, 4) === "2027").length > 0, true);
  assert.equal(first.some((event) => event.name.includes("跨月")), true);
  assert.equal(first.some((event) => event.name.includes("跨年")), true);
});

test("seed plan reuses matching deterministic rows and never overwrites them", () => {
  const events = buildSeedEvents();
  const existing = events.slice(0, 3).map(({ id, name }) => ({ id, name }));
  const plan = buildPlan(events, existing);
  assert.equal(plan.reuse, 3);
  assert.equal(plan.create.length, events.length - 3);
});

test("seed plan rejects an identity conflict", () => {
  const [event] = buildSeedEvents();
  assert.throws(() => buildPlan([event], [{ id: event.id, name: "unrelated existing event" }]), /Seed identity conflict/);
});
