import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = () => readFile(new URL("../supabase/migrations/202610260001_add_event_publication_status.sql", import.meta.url), "utf8");
const types = () => readFile(new URL("../src/types/database.tsx", import.meta.url), "utf8");
const canonical = () => readFile(new URL("../supabase/schema/canonical-public-schema.sql", import.meta.url), "utf8");
const service = () => readFile(new URL("../src/services/events/events.service.ts", import.meta.url), "utf8");
const adminRoute = () => readFile(new URL("../src/app/api/admin/events/[id]/route.ts", import.meta.url), "utf8");
const checkInRoute = () => readFile(new URL("../src/app/api/events/[id]/check-in/route.ts", import.meta.url), "utf8");

test("event publication migration has safe default, historical backfill, and constrained status", async () => {
  const sql = await migration();
  assert.match(sql, /add column publication_status text not null default 'draft'/i);
  assert.match(sql, /add column cancelled_at timestamptz null/i);
  assert.match(sql, /events_publication_status_check[\s\S]*publication_status in \('draft', 'published'\)/i);
  assert.match(sql, /update public\.events[\s\S]*set publication_status = 'published'[\s\S]*where publication_status = 'draft'/i);
  assert.match(sql, /begin;[\s\S]*commit;/i);
});

test("Event database type and canonical schema expose only Phase 1A fields", async () => {
  const [source, schema] = await Promise.all([types(), canonical()]);
  assert.match(source, /publication_status: "draft" \| "published";/);
  assert.match(source, /cancelled_at: Timestamp \| null;/);
  assert.match(schema, /publication_status text not null default 'draft'/i);
  assert.match(schema, /cancelled_at timestamptz/i);
  assert.match(schema, /events_publication_status_check[\s\S]*publication_status in \('draft', 'published'\)/i);
  const eventBlock = source.match(/export type Event = \{[\s\S]*?\n\};/)?.[0] ?? "";
  assert.doesNotMatch(eventBlock, /archived|published_at|cancellation_reason|template_id/);
});

test("Phase 1A does not alter attendance relationship in migration", async () => {
  const sql = await migration();
  assert.doesNotMatch(sql, /event_attendances|foreign key|drop column|drop constraint/i);
});

test("Phase 1B keeps publication defaults and cancellation actions server-side", async () => {
  const [serviceSource, routeSource, checkInSource] = await Promise.all([service(), adminRoute(), checkInRoute()]);
  assert.match(serviceSource, /publication_status: data\.publication_status \?\? "published"/);
  assert.match(serviceSource, /cancelEvent: async/);
  assert.match(serviceSource, /restoreEvent: async/);
  assert.match(serviceSource, /cancelled_at\) throw new EventCancelledError/);
  assert.match(routeSource, /eventActionSchema\.parse\(body\)/);
  assert.match(routeSource, /action === "cancel"/);
  assert.match(routeSource, /restoreEvent/);
  assert.match(checkInSource, /EventCancelledError/);
});
