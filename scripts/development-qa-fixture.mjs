import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import argon2 from "argon2";
import { createClient } from "@supabase/supabase-js";

export const FIXTURE_VERSION = "dev-qa-v1";
export const CANONICAL_REFERENCE_DATE = "2026-09-19";
export const DEVELOPMENT_PROJECT_REF = "mrsyfssstigartmhofuz";
export const PRODUCTION_PROJECT_REF = "gcydchpuckbmctcjpokz";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const FIXTURE_NAMESPACE = "ntust-bgc-development-qa-v1";
function uuidFor(key) {
  const hex = createHash("sha256").update(`${FIXTURE_NAMESPACE}:${key}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function iso(referenceDate, dayOffset, hour = 4) {
  const date = new Date(`${referenceDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function parseDevelopmentTarget(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("SUPABASE_URL must be a valid URL"); }
  if (url.hostname === `${PRODUCTION_PROJECT_REF}.supabase.co`) throw new Error("Refusing to run against Production");
  if (url.protocol !== "https:" || url.hostname !== `${DEVELOPMENT_PROJECT_REF}.supabase.co` || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error(`Target must be exact Development Supabase ${DEVELOPMENT_PROJECT_REF}`);
  }
  return DEVELOPMENT_PROJECT_REF;
}

export function parseReferenceDate(value) {
  const match = DATE_ONLY.exec(value ?? "");
  if (!match) throw new Error("--reference-date must be YYYY-MM-DD");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (date.toISOString().slice(0, 10) !== value) throw new Error("--reference-date must be a real calendar date");
  return value;
}

export function parseArguments(args) {
  let referenceDate;
  let confirmDevelopment = false;
  let dryRun = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--confirm-development") confirmDevelopment = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--reference-date") {
      const next = args[++index];
      if (!next || next.startsWith("--")) throw new Error("--reference-date requires a value");
      referenceDate = next;
    } else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (!confirmDevelopment) throw new Error("Missing required --confirm-development");
  return { referenceDate: parseReferenceDate(referenceDate), confirmDevelopment, dryRun };
}

function fixtureUser(index) {
  const padded = String(index).padStart(2, "0");
  const isLong = index === 2;
  const isMissingProfile = index === 3;
  const isUnverified = index === 4;
  const isClosed = index === 20;
  return {
    id: uuidFor(`user:${padded}`),
    email: isClosed ? `closed-${uuidFor(`closed-user:${padded}`)}@account.invalid` : `dev-qa-${padded}@example.test`,
    name: isClosed ? "已註銷使用者" : isLong ? `DEV-QA-${"very-long-public-name-".repeat(4)}02` : `DEV QA 使用者 ${padded}`,
    email_verified_at: isClosed || isUnverified ? null : iso(CANONICAL_REFERENCE_DATE, -30 + index),
    closed_at: isClosed ? iso(CANONICAL_REFERENCE_DATE, -1) : null,
    avatar: null,
    profile: isMissingProfile || isClosed ? null : {
      real_name: isLong ? "測試長名稱使用者二號" : `測試姓名 ${padded}`,
      phone: `090000${String(index).padStart(4, "0")}`,
      student_id: `QA${String(100000 + index)}`,
      school: "Development 測試學校",
      department: index % 2 ? "桌遊測試系" : "品質保證系",
      grade: String((index % 4) + 1),
    },
  };
}

export function buildFixture(referenceDate = CANONICAL_REFERENCE_DATE) {
  parseReferenceDate(referenceDate);
  const users = Array.from({ length: 20 }, (_, index) => fixtureUser(index + 1));
  const years = [
    { id: uuidFor("year:114"), year: "114", start_date: "2025-09-08", end_date: "2026-09-06", is_current: false },
    { id: uuidFor("year:116"), year: "116", start_date: "2027-09-06", end_date: "2028-09-03", is_current: false },
  ];
  const categories = ["策略", "派對", "合作", "雙人"].map((name, index) => ({ id: uuidFor(`category:${index + 1}`), name: `DEV QA ${name}`, description: `Development QA ${name}分類` }));
  const locations = ["社辦 A 櫃", "社辦 B 櫃", "活動箱"].map((name, index) => ({ id: uuidFor(`location:${index + 1}`), name: `DEV QA ${name}`, description: "Development QA 專用位置" }));
  const games = Array.from({ length: 25 }, (_, index) => ({
    id: uuidFor(`game:${index + 1}`),
    name: index === 24 ? `DEV QA ${"超長桌遊名稱".repeat(10)}` : `DEV QA 桌遊 ${String(index + 1).padStart(2, "0")}`,
    description: index === 23 ? `第一段說明。\n\n${"這是用來驗證長描述排版的 Development QA 文字。".repeat(18)}` : `Development QA 桌遊情境 ${index + 1}`,
    description_format: "plain_text", rich_description: null, image: null,
    category_id: categories[index % categories.length].id,
    location_id: locations[index % locations.length].id,
    status: [0, 6, 12, 18].includes(index) ? "borrowed"
      : index === 21 ? "maintenance" : index === 22 ? "lost"
        : index === 23 ? "damaged" : index === 24 ? "retired" : "available",
    inventory_number: 900001 + index,
  }));
  const officers = [
    { user_id: users[0].id, academic_year: "114", title: "DEV QA 歷史幹部" },
    { user_id: users[1].id, academic_year: "115", title: `DEV QA ${"很長的幹部職稱".repeat(6)}` },
    { user_id: users[2].id, academic_year: "115", title: "DEV QA 現任幹部" },
  ];
  const membershipStatuses = ["active", "pending", "suspended", "expired", "cancelled"];
  const memberships = users.map((user, index) => ({
    user_id: user.id,
    academic_year: index % 5 === 3 ? "114" : "115",
    status: membershipStatuses[index % membershipStatuses.length],
    joined_at: iso(referenceDate, -120 + index),
  }));
  memberships.push({ user_id: users[0].id, academic_year: "114", status: "expired", joined_at: iso(referenceDate, -400) });
  const actor = { id: "$actor" };
  const reviewPairs = [[actor, games[0], 0], [users[19], games[0], 1]];
  for (let index = 1; index < 10; index += 1) reviewPairs.push([users[index], games[0], index + 1]);
  for (let index = 1; index < 11; index += 1) reviewPairs.push([actor, games[index], index + 10]);
  const reviews = reviewPairs.map(([user, game, index]) => ({
    id: uuidFor(`review:${user.id}:${game.id}`), board_game_id: game.id, user_id: user.id,
    rating: (index % 5) + 1,
    content: index === 0 ? null : index === 1 ? "短評" : index === 2 ? "第一行\n第二行\n第三行" : index === 3 ? "長篇 QA 評論。".repeat(120) : `Development QA 評論 ${index + 1}`,
    created_at: iso(referenceDate, -40 + index), updated_at: iso(referenceDate, -40 + index),
  }));
  const borrowingStatuses = ["borrowed", "pending", "approved", "returned", "rejected", "cancelled"];
  const borrowings = Array.from({ length: 21 }, (_, index) => {
    const status = borrowingStatuses[index % borrowingStatuses.length];
    const created = iso(referenceDate, -35 + index);
    return {
      board_game_id: games[index].id,
      user_id: index < 11 ? "$actor" : users[6 + (index % 8)].id,
      status,
      created_at: created,
      approved_at: ["approved", "borrowed", "returned"].includes(status) ? iso(referenceDate, -34 + index) : null,
      rejected_at: status === "rejected" ? iso(referenceDate, -34 + index) : null,
      cancelled_at: status === "cancelled" ? iso(referenceDate, -34 + index) : null,
      borrowed_at: ["borrowed", "returned"].includes(status) ? iso(referenceDate, -33 + index) : null,
      due_at: status === "borrowed" ? (index === 0 ? iso(referenceDate, -2) : iso(referenceDate, 14)) : status === "returned" ? iso(referenceDate, -20 + index) : null,
      returned_at: status === "returned" ? iso(referenceDate, -18 + index) : null,
      approved_by_actor: ["approved", "borrowed", "returned", "rejected"].includes(status),
    };
  });
  const eventOffsets = [-40, -10, 0, 7, 40];
  const events = eventOffsets.map((offset, index) => ({
    id: uuidFor(`event:${index + 1}`), name: `DEV QA 活動 ${index + 1}`,
    description: `Development QA 活動情境 ${index + 1}`, description_format: "plain_text", rich_description: null,
    start_time: iso(referenceDate, offset, 10), end_time: iso(referenceDate, offset, 13),
    check_in_opens_at: index === 2 ? iso(referenceDate, offset, 3) : null,
    check_in_closes_at: index === 2 ? iso(referenceDate, offset, 20) : null,
  }));
  const attendanceStatuses = ["present", "late", "absent"];
  const attendances = Array.from({ length: 12 }, (_, index) => ({
    event_id: events[index % 2].id, user_id: users[index].id,
    status: attendanceStatuses[index % 3],
    attended_at: attendanceStatuses[index % 3] === "absent" ? null : iso(referenceDate, -40 + (index % 2), 11),
  }));
  const announcements = Array.from({ length: 4 }, (_, index) => ({
    title: `DEV QA 公告 ${index + 1}`,
    content: index === 3 ? "多行公告第一行\n多行公告第二行" : `Development QA 公告內容 ${index + 1}`,
    content_format: "plain_text", rich_content: null,
    is_published: index < 3,
    published_at: index < 3 ? iso(referenceDate, -7 + index) : null,
  }));
  return { version: FIXTURE_VERSION, referenceDate, users, years, categories, locations, games, officers, memberships, reviews, borrowings, events, attendances, announcements };
}

const comparable = {
  users: ["id", "email", "name", "email_verified_at", "closed_at", "avatar"],
  academic_years: ["id", "year", "start_date", "end_date", "is_current"],
  board_game_categories: ["id", "name", "description"],
  board_game_locations: ["id", "name", "description"],
  board_games: ["id", "name", "description", "description_format", "rich_description", "image", "category_id", "location_id", "status", "inventory_number"],
  board_game_reviews: ["id", "board_game_id", "user_id", "rating", "content", "created_at", "updated_at"],
  events: ["id", "name", "description", "description_format", "rich_description", "start_time", "end_time", "check_in_opens_at", "check_in_closes_at"],
};

function equalFields(existing, expected, fields) {
  const instantFields = new Set(["email_verified_at", "closed_at", "joined_at", "created_at", "updated_at", "approved_at", "rejected_at", "cancelled_at", "borrowed_at", "due_at", "returned_at", "published_at", "attended_at", "start_time", "end_time", "check_in_opens_at", "check_in_closes_at"]);
  return fields.every((field) => {
    const left = existing[field] ?? null;
    const right = expected[field] ?? null;
    if (instantFields.has(field) && left !== null && right !== null) return Date.parse(left) === Date.parse(right);
    return JSON.stringify(left) === JSON.stringify(right);
  });
}

function planStableRows(table, expectedRows, existingRows, identity, fields = comparable[table]) {
  let reuse = 0;
  const create = [];
  for (const expected of expectedRows) {
    const current = existingRows.find((row) => identity(row) === identity(expected));
    if (!current) create.push(expected);
    else if (!equalFields(current, expected, fields)) throw new Error(`Conflicting ${table} fixture identity: ${identity(expected)}`);
    else reuse += 1;
  }
  return { reuse, create };
}

function planUsers(expectedRows, existingRows) {
  let reuse = 0;
  const create = [];
  for (const expected of expectedRows) {
    const current = existingRows.find((row) => row.email === expected.email);
    if (!current) { create.push(expected); continue; }
    const verificationCompatible = expected.email_verified_at ? true : !current.email_verified_at;
    const same = current.id === expected.id && current.name === expected.name && current.avatar === null
      && verificationCompatible
      && Boolean(current.closed_at) === Boolean(expected.closed_at);
    if (!same) throw new Error(`Conflicting users fixture identity: ${expected.email}`);
    reuse += 1;
  }
  return { reuse, create };
}

function userRow(user) {
  return {
    id: user.id, email: user.email, name: user.name,
    email_verified_at: user.email_verified_at, closed_at: user.closed_at,
    avatar: user.avatar,
  };
}

export function planFixture(fixture, state) {
  const actorCandidates = state.users.filter((user) => !user.email.endsWith("@example.test") && !user.closed_at && user.email_verified_at && state.officer_positions.some((position) => position.user_id === user.id));
  if (actorCandidates.length !== 1) throw new Error("Expected exactly one existing non-fixture verified historical Officer actor");
  const actor = actorCandidates[0];
  const year115 = state.academic_years.find((year) => year.year === "115");
  if (!year115 || year115.start_date !== "2026-09-07" || year115.end_date !== "2027-09-05") throw new Error("Existing Academic Year 115 does not match the approved bootstrap state");
  const actorPositions = state.officer_positions.filter((position) => position.user_id === actor.id && position.academic_year_id === year115.id);
  if (actorPositions.length !== 1 || actorPositions[0].title !== "神") throw new Error("Existing bootstrap OfficerPosition is missing or ambiguous");

  const plans = {};
  plans.users = planUsers(fixture.users.map(userRow), state.users);
  plans.academic_years = planStableRows("academic_years", fixture.years, state.academic_years, (row) => row.year);
  plans.board_game_categories = planStableRows("board_game_categories", fixture.categories, state.board_game_categories, (row) => row.name);
  plans.board_game_locations = planStableRows("board_game_locations", fixture.locations, state.board_game_locations, (row) => row.name);
  plans.board_games = planStableRows("board_games", fixture.games, state.board_games, (row) => row.inventory_number);
  const expectedReviews = fixture.reviews.map((item) => ({ ...item, user_id: item.user_id === "$actor" ? actor.id : item.user_id }));
  plans.board_game_reviews = planStableRows("board_game_reviews", expectedReviews, state.board_game_reviews, (row) => `${row.user_id}:${row.board_game_id}`);
  plans.events = planStableRows("events", fixture.events, state.events, (row) => row.id);

  const resolveYear = (identifier) => identifier === "115" ? year115 : fixture.years.find((year) => year.year === identifier);
  const expectedOfficers = fixture.officers.map((item) => ({ ...item, academic_year_id: resolveYear(item.academic_year).id }));
  plans.officer_positions = planStableRows("officer_positions", expectedOfficers, state.officer_positions, (row) => `${row.user_id}:${row.academic_year_id}`, ["user_id", "academic_year_id", "title"]);
  const expectedMemberships = fixture.memberships.map((item) => ({ ...item, academic_year_id: resolveYear(item.academic_year).id }));
  plans.memberships = planStableRows("memberships", expectedMemberships, state.memberships, (row) => `${row.user_id}:${row.academic_year_id}`, ["user_id", "academic_year_id", "status", "joined_at"]);
  const expectedBorrowings = fixture.borrowings.map((item) => ({ ...item, user_id: item.user_id === "$actor" ? actor.id : item.user_id, approved_by_user_id: item.approved_by_actor ? actor.id : null }));
  plans.board_game_borrowings = planStableRows("board_game_borrowings", expectedBorrowings, state.board_game_borrowings, (row) => `${row.user_id}:${row.board_game_id}`, ["user_id", "board_game_id", "status", "created_at", "approved_at", "rejected_at", "cancelled_at", "borrowed_at", "due_at", "returned_at", "approved_by_user_id"]);
  plans.event_attendances = planStableRows("event_attendances", fixture.attendances, state.event_attendances, (row) => `${row.event_id}:${row.user_id}`, ["event_id", "user_id", "status", "attended_at"]);
  const expectedAnnouncements = fixture.announcements.map((item) => ({ ...item, author_id: actor.id }));
  plans.announcements = planStableRows("announcements", expectedAnnouncements, state.announcements, (row) => row.title, ["title", "content", "content_format", "rich_content", "is_published", "published_at", "author_id"]);

  const profiles = fixture.users.filter((user) => user.profile).map((user) => ({ user_id: user.id, ...user.profile }));
  plans.user_profiles = planStableRows("user_profiles", profiles, state.user_profiles, (row) => row.user_id, ["user_id", "real_name", "phone", "student_id", "school", "department", "grade"]);
  const openUsers = fixture.users.filter((user) => !user.closed_at);
  plans.auth_credentials = { reuse: openUsers.filter((user) => state.auth_credentials.some((credential) => credential.user_id === user.id)).length, create: openUsers.filter((user) => !state.auth_credentials.some((credential) => credential.user_id === user.id)) };
  plans.verifications = { reuse: openUsers.filter((user) => !user.email_verified_at || state.users.find((row) => row.id === user.id)?.email_verified_at).length, create: openUsers.filter((user) => user.email_verified_at && !state.users.find((row) => row.id === user.id)?.email_verified_at) };
  plans.current_academic_year = { reuse: year115.is_current ? 1 : 0, create: year115.is_current ? [] : [year115] };

  const totals = Object.fromEntries(Object.entries(plans).map(([key, value]) => [key, { reuse: value.reuse, create: value.create.length }]));
  return { actorId: actor.id, year115, plans, totals };
}

function requiredData(context, data, error) {
  if (error) throw new Error(`${context} failed (${error.code ?? "unknown"})`);
  return data ?? [];
}

export async function readFixtureState(client) {
  const selects = {
    users: "id,email,name,email_verified_at,closed_at,avatar",
    user_profiles: "user_id,real_name,phone,student_id,school,department,grade",
    auth_credentials: "user_id",
    academic_years: "id,year,start_date,end_date,is_current",
    officer_positions: "id,user_id,academic_year_id,title",
    memberships: "id,user_id,academic_year_id,status,joined_at,type",
    board_game_categories: "id,name,description", board_game_locations: "id,name,description",
    board_games: "id,name,description,description_format,rich_description,image,category_id,location_id,status,inventory_number",
    board_game_reviews: "id,board_game_id,user_id,rating,content,created_at,updated_at",
    board_game_borrowings: "id,user_id,board_game_id,status,created_at,approved_at,rejected_at,cancelled_at,borrowed_at,due_at,returned_at,approved_by_user_id",
    events: "id,name,description,description_format,rich_description,start_time,end_time,check_in_opens_at,check_in_closes_at",
    event_attendances: "id,event_id,user_id,status,attended_at",
    announcements: "id,title,content,content_format,rich_content,is_published,published_at,author_id",
  };
  const state = {};
  for (const [table, columns] of Object.entries(selects)) {
    const result = await client.from(table).select(columns);
    state[table] = requiredData(`${table} inspection`, result.data, result.error);
  }
  return state;
}

async function insertRows(client, table, rows) {
  if (!rows.length) return;
  const result = await client.from(table).insert(rows);
  requiredData(`${table} creation`, [], result.error);
}

export async function applyFixture(client, fixture, plan) {
  await insertRows(client, "users", plan.plans.users.create.map((user) => ({ ...user, email_verified_at: null })));
  for (const user of plan.plans.auth_credentials.create) {
    const passwordHash = await argon2.hash(randomBytes(32).toString("base64url"));
    await insertRows(client, "auth_credentials", [{ id: uuidFor(`credential:${user.id}`), user_id: user.id, password_hash: passwordHash }]);
  }
  await insertRows(client, "user_profiles", plan.plans.user_profiles.create);
  for (const user of plan.plans.verifications.create) {
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const now = new Date();
    const issued = await client.rpc("issue_email_verification_token", { p_user_id: user.id, p_token_hash: tokenHash, p_expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), p_cooldown_before: new Date(now.getTime() - 60 * 1000).toISOString() });
    if (issued.error || !["issued", "already_verified"].includes(issued.data)) throw new Error("Canonical verification issuance failed");
    if (issued.data === "issued") {
      const consumed = await client.rpc("consume_email_verification_token", { p_token_hash: tokenHash });
      if (consumed.error || consumed.data !== "verified") throw new Error("Canonical verification consumption failed");
    }
  }
  await insertRows(client, "academic_years", plan.plans.academic_years.create);
  if (plan.plans.current_academic_year.create.length) {
    const result = await client.rpc("set_current_academic_year", { p_academic_year_id: plan.year115.id });
    requiredData("Current Academic Year selection", result.data, result.error);
  }
  await insertRows(client, "board_game_categories", plan.plans.board_game_categories.create);
  await insertRows(client, "board_game_locations", plan.plans.board_game_locations.create);
  await insertRows(client, "board_games", plan.plans.board_games.create);
  for (const officer of plan.plans.officer_positions.create) {
    const result = await client.rpc("create_officer_position", { p_user_id: officer.user_id, p_academic_year_id: officer.academic_year_id, p_title: officer.title });
    requiredData("Officer creation", result.data, result.error);
  }
  for (const membership of plan.plans.memberships.create) {
    const result = await client.rpc("create_admin_membership", { p_user_id: membership.user_id, p_academic_year_id: membership.academic_year_id, p_status: membership.status, p_joined_at: membership.joined_at });
    requiredData("Membership creation", result.data, result.error);
  }
  await insertRows(client, "board_game_reviews", plan.plans.board_game_reviews.create);
  await insertRows(client, "board_game_borrowings", plan.plans.board_game_borrowings.create.map((item) => ({
    board_game_id: item.board_game_id, user_id: item.user_id, status: item.status,
    created_at: item.created_at, approved_at: item.approved_at,
    rejected_at: item.rejected_at, cancelled_at: item.cancelled_at,
    borrowed_at: item.borrowed_at, due_at: item.due_at,
    returned_at: item.returned_at, approved_by_user_id: item.approved_by_user_id,
  })));
  await insertRows(client, "events", plan.plans.events.create);
  await insertRows(client, "event_attendances", plan.plans.event_attendances.create);
  await insertRows(client, "announcements", plan.plans.announcements.create);
}

export function formatPlan(fixture, plan, dryRun) {
  const lines = [
    `Fixture version: ${fixture.version}`, "Target: Development Supabase",
    `Project ref: ${DEVELOPMENT_PROJECT_REF}`, `Reference date: ${fixture.referenceDate}`,
    `Mode: ${dryRun ? "dry-run" : "apply"}`,
  ];
  for (const [domain, counts] of Object.entries(plan.totals)) lines.push(`${domain}: reuse ${counts.reuse}, create ${counts.create}`);
  lines.push(`Total reused: ${Object.values(plan.totals).reduce((sum, item) => sum + item.reuse, 0)}`);
  lines.push(`Total to create: ${Object.values(plan.totals).reduce((sum, item) => sum + item.create, 0)}`);
  return lines.join("\n");
}

async function main() {
  if (existsSync(".env.local") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");
  const options = parseArguments(process.argv.slice(2));
  parseDevelopmentTarget(process.env.SUPABASE_URL);
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is required in the environment");
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const fixture = buildFixture(options.referenceDate);
  const state = await readFixtureState(client);
  const plan = planFixture(fixture, state);
  console.log(formatPlan(fixture, plan, options.dryRun));
  if (options.dryRun) { console.log("Dry-run complete; zero writes performed."); return; }
  await applyFixture(client, fixture, plan);
  console.log("Development QA fixture applied.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "Development QA fixture failed"); process.exitCode = 1; });
}
