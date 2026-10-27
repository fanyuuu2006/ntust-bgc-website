import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

export const DEVELOPMENT_PROJECT_REF = "mrsyfssstigartmhofuz";
export const SEED_VERSION = "events-dev-qa-v1";
const SEED_PREFIX = "[DEV-QA]";
const COLORS = ["#2563EB", "#F97316", "#7C3AED", "#16A34A", "#DC2626"];
const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_CANCELLED_AT = "2026-10-27T00:00:00.000Z";

function stableUuid(key) {
  const hex = createHash("sha256").update(`${SEED_VERSION}:${key}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function parseArgs(args) {
  const apply = args.includes("--apply");
  const confirm = args.includes("--confirm-development");
  if (args.some((arg) => !["--apply", "--confirm-development"].includes(arg))) {
    throw new Error("Usage: node scripts/seed-development-events.mjs [--apply --confirm-development]");
  }
  if (apply && !confirm) throw new Error("--apply requires --confirm-development");
  return { apply };
}

function assertDevelopmentTarget(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== `${DEVELOPMENT_PROJECT_REF}.supabase.co` || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`Refusing non-DEV target; expected ${DEVELOPMENT_PROJECT_REF}.supabase.co`);
  }
}

function localIso(year, month, day, hour, minute = 0) {
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`).toISOString();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function richDescription(text) {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

export function buildSeedEvents() {
  const themes = ["期初迎新", "桌遊新手教學", "策略桌遊交流", "派對桌遊之夜", "桌遊比賽", "聯合社課", "期末聚會", "主題桌遊研究"];
  const events = [];
  const start = new Date("2025-01-18T18:30:00+08:00");
  for (let index = 0; index < 120; index += 1) {
    const date = addDays(start, index * 8 + (index % 4));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hour = 18 + (index % 3);
    const durationHours = index % 11 === 0 ? 30 : index % 5 === 0 ? 5 : 3;
    const end = new Date(new Date(localIso(year, month, day, hour)).getTime() + durationHours * 60 * 60 * 1000);
    const draft = index % 10 === 2;
    const cancelled = !draft && index % 17 === 0;
    const rich = index % 4 === 0;
    const name = `${SEED_PREFIX} ${themes[index % themes.length]} ${String(index + 1).padStart(3, "0")}`;
    events.push({
      id: stableUuid(`event:${index + 1}`),
      name,
      description: rich ? `DEV／QA 活動資料 ${index + 1}：提供 Calendar、Public API 與預覽驗證。` : `DEV／QA 測試活動 ${index + 1}，用於驗證日期、狀態與活動列表。`,
      description_format: rich ? "rich_text_v1" : "plain_text",
      rich_description: rich ? richDescription(`這是 ${name} 的 Rich Text 測試內容。`) : null,
      start_time: localIso(year, month, day, hour),
      end_time: end.toISOString(),
      check_in_opens_at: index % 6 === 0 ? localIso(year, month, day, hour - 1) : null,
      check_in_closes_at: index % 6 === 0 ? end.toISOString() : null,
      publication_status: draft ? "draft" : "published",
      // 固定取消時間，讓預覽、重複執行與單元測試都保持 deterministic。
      cancelled_at: cancelled ? new Date(new Date(SEED_CANCELLED_AT).getTime() - index * 60_000).toISOString() : null,
      calendar_color: COLORS[index % COLORS.length],
    });
  }

  // 補上跨月與跨年案例，並保留同一個可重複執行的識別規則。
  events.push({
    id: stableUuid("event:cross-month"), name: `${SEED_PREFIX} 跨月聯合社課`, description: "跨月活動測試。", description_format: "plain_text", rich_description: null,
    start_time: localIso(2026, 12, 31, 22), end_time: localIso(2027, 1, 1, 2), check_in_opens_at: null, check_in_closes_at: null,
    publication_status: "published", cancelled_at: null, calendar_color: COLORS[1],
  });
  events.push({
    id: stableUuid("event:year-end"), name: `${SEED_PREFIX} 年底跨年聚會`, description: "跨年度活動測試。", description_format: "rich_text_v1", rich_description: richDescription("跨年度 Rich Text 測試內容。"),
    start_time: localIso(2026, 12, 31, 23), end_time: localIso(2027, 1, 1, 1), check_in_opens_at: localIso(2026, 12, 31, 22), check_in_closes_at: localIso(2027, 1, 1, 1),
    publication_status: "published", cancelled_at: null, calendar_color: COLORS[2],
  });
  return events;
}

async function readExisting(client, ids) {
  const { data, error } = await client.from("events").select("id,name,publication_status,cancelled_at,calendar_color,start_time,end_time").in("id", ids);
  if (error) throw new Error(`Existing event inspection failed: ${error.message}`);
  return data ?? [];
}

export function buildPlan(events, existing) {
  const byId = new Map(existing.map((event) => [event.id, event]));
  const create = events.filter((event) => !byId.has(event.id));
  const conflicts = events.filter((event) => byId.has(event.id) && byId.get(event.id).name !== event.name);
  if (conflicts.length) throw new Error(`Seed identity conflict for ${conflicts[0].id}`);
  return { create, reuse: events.length - create.length, conflicts };
}

export function formatPlan(events, plan, apply) {
  const status = Object.groupBy(events, (event) => `${event.publication_status}${event.cancelled_at ? ":cancelled" : ""}`);
  return [
    `Seed version: ${SEED_VERSION}`,
    `Target: Development Supabase (${DEVELOPMENT_PROJECT_REF})`,
    `Mode: ${apply ? "apply" : "preview"}`,
    `Total planned: ${events.length}`,
    `To create: ${plan.create.length}`,
    `Reuse: ${plan.reuse}`,
    `Published: ${(status.published ?? []).length}`,
    `Draft: ${(status.draft ?? []).length}`,
    `Cancelled published: ${(status["published:cancelled"] ?? []).length}`,
    `Rich Text: ${events.filter((event) => event.description_format === "rich_text_v1").length}`,
    `With check-in window: ${events.filter((event) => event.check_in_opens_at).length}`,
  ].join("\n");
}

async function main() {
  if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");
  const { apply } = parseArgs(process.argv.slice(2));
  assertDevelopmentTarget(process.env.SUPABASE_URL);
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is required");
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const events = buildSeedEvents();
  const existing = await readExisting(client, events.map((event) => event.id));
  const plan = buildPlan(events, existing);
  console.log(formatPlan(events, plan, apply));
  if (!apply) { console.log("Preview only; no writes performed."); return; }
  if (plan.create.length) {
    const { error } = await client.from("events").insert(plan.create);
    if (error) throw new Error(`Seed insert failed: ${error.message}`);
  }
  console.log(`Created ${plan.create.length} DEV/QA events; reused ${plan.reuse}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "Event seed failed"); process.exitCode = 1; });
}
