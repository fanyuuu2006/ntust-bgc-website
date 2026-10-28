import test from "node:test";
import assert from "node:assert/strict";
import { load } from "./helpers/load-app-module.mjs";

test("event templates validate reusable content and never require event dates", async () => {
  let payload;
  const { eventTemplatesService } = load("src/services/events/event-templates.service.ts", {
    "@/repositories/event-templates.repository": { eventTemplatesRepository: { create: async (value) => { payload = value; return value; }, updateById: async () => null, findMany: async () => [], findById: async () => null, deleteById: async () => {} } },
  });
  await eventTemplatesService.create({ name: "週末桌遊", description: "說明", description_format: "plain_text", rich_description: null, calendar_color: null });
  assert.equal(payload.name, "週末桌遊");
  assert.equal("start_time" in payload, false);
  assert.equal("publication_status" in payload, false);
});

test("template admin API remains protected and isolated from public event routes", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile("src/app/api/admin/event-templates/route.ts", "utf8"));
  assert.match(source, /authorizeAdminRequest/);
  assert.doesNotMatch(source, /publication_status/);
});
