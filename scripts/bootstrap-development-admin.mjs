import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

export const DEVELOPMENT_PROJECT_REF = "mrsyfssstigartmhofuz";
export const PRODUCTION_PROJECT_REF = "gcydchpuckbmctcjpokz";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDevelopmentTarget(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("SUPABASE_URL must be a valid Development Supabase URL");
  }

  const expectedHost = `${DEVELOPMENT_PROJECT_REF}.supabase.co`;
  const productionHost = `${PRODUCTION_PROJECT_REF}.supabase.co`;
  if (url.hostname === productionHost) {
    throw new Error("Refusing to run against the Production Supabase project");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== expectedHost ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(`Target must be Development Supabase ${DEVELOPMENT_PROJECT_REF}`);
  }
  return DEVELOPMENT_PROJECT_REF;
}

function isValidDateOnly(value) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

export function parseBootstrapInput(value) {
  const email = value.email?.trim().toLowerCase();
  const year = value.year?.trim();
  const startDate = value.startDate?.trim();
  const endDate = value.endDate?.trim();
  const title = value.title?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid account email is required");
  if (!year || !/^\d{3}$/.test(year)) throw new Error("Academic Year identifier must be exactly three digits");
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) throw new Error("Academic Year dates must be real YYYY-MM-DD values");
  if (startDate >= endDate) throw new Error("Academic Year start date must be before end date");
  if (!title) throw new Error("Officer position is required");
  return { email, year, startDate, endDate, title };
}

export async function bootstrapDevelopmentAdmin(input, adapter, options = {}) {
  if (!options.confirmDevelopment) throw new Error("Missing required --confirm-development");
  const data = parseBootstrapInput(input);
  const user = await adapter.findUserByEmail(data.email);
  if (!user) throw new Error("Registered Development account was not found");
  if (user.closed_at) throw new Error("Closed accounts cannot be bootstrapped");

  const existingYear = await adapter.findAcademicYearByIdentifier(data.year);
  if (existingYear && (existingYear.start_date !== data.startDate || existingYear.end_date !== data.endDate)) {
    throw new Error("Academic Year identifier exists with conflicting dates");
  }
  const existingPositions = existingYear
    ? await adapter.findOfficerPositions(user.id, existingYear.id)
    : [];
  const exactPosition = existingPositions.some((position) => position.title === data.title);

  const plan = {
    verifyUser: !user.email_verified_at,
    createAcademicYear: !existingYear,
    createOfficerPosition: !exactPosition,
  };
  if (options.dryRun) return { dryRun: true, plan };

  if (plan.verifyUser) await adapter.verifyUserCanonically(user.id);
  const academicYear = existingYear ?? await adapter.createAcademicYear({
    year: data.year,
    start_date: data.startDate,
    end_date: data.endDate,
  });
  if (plan.createOfficerPosition) {
    await adapter.createOfficerPosition({
      userId: user.id,
      academicYearId: academicYear.id,
      title: data.title,
    });
  }
  return { dryRun: false, plan };
}

export function createSupabaseBootstrapAdapter(supabase) {
  const requireData = (context, data, error) => {
    if (error) throw new Error(`${context} failed`);
    return data;
  };
  return {
    async findUserByEmail(email) {
      const result = await supabase.from("users").select("id,email,email_verified_at,closed_at").eq("email", email).maybeSingle();
      return requireData("User lookup", result.data, result.error);
    },
    async findAcademicYearByIdentifier(year) {
      const result = await supabase.from("academic_years").select("id,year,start_date,end_date,is_current").eq("year", year).maybeSingle();
      return requireData("Academic Year lookup", result.data, result.error);
    },
    async findOfficerPositions(userId, academicYearId) {
      const result = await supabase.from("officer_positions").select("id,title").eq("user_id", userId).eq("academic_year_id", academicYearId);
      return requireData("Officer lookup", result.data ?? [], result.error);
    },
    async verifyUserCanonically(userId) {
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken, "utf8").digest("hex");
      const now = new Date();
      const issue = await supabase.rpc("issue_email_verification_token", {
        p_user_id: userId,
        p_token_hash: tokenHash,
        p_expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
        p_cooldown_before: new Date(now.getTime() - 60 * 1000).toISOString(),
      });
      const issueResult = requireData("Verification token issuance", issue.data, issue.error);
      if (issueResult === "already_verified") return;
      if (issueResult === "cooldown") throw new Error("Verification token issuance is in cooldown; retry later");
      if (issueResult !== "issued") throw new Error("Unexpected verification issuance result");
      const consume = await supabase.rpc("consume_email_verification_token", { p_token_hash: tokenHash });
      const consumeResult = requireData("Verification token consumption", consume.data, consume.error);
      if (consumeResult !== "verified") throw new Error("Canonical email verification did not complete");
    },
    async createAcademicYear(payload) {
      // The canonical Academic Year service validates this same contract, then
      // performs this repository insert; no create RPC exists.
      const result = await supabase.from("academic_years").insert({ ...payload, is_current: false }).select("id,year,start_date,end_date,is_current").single();
      return requireData("Academic Year creation", result.data, result.error);
    },
    async createOfficerPosition({ userId, academicYearId, title }) {
      const result = await supabase.rpc("create_officer_position", {
        p_user_id: userId,
        p_academic_year_id: academicYearId,
        p_title: title,
      });
      return requireData("Officer creation", result.data, result.error);
    },
  };
}

function parseArguments(args) {
  const values = {};
  const flags = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--confirm-development" || argument === "--dry-run") flags.add(argument);
    else if (argument.startsWith("--")) {
      const next = args[index + 1];
      if (!next || next.startsWith("--")) throw new Error(`${argument} requires a value`);
      values[argument.slice(2)] = next;
      index += 1;
    } else throw new Error(`Unexpected argument: ${argument}`);
  }
  return {
    input: { email: values.email, year: values.year, startDate: values.start, endDate: values.end, title: values.title },
    confirmDevelopment: flags.has("--confirm-development"),
    dryRun: flags.has("--dry-run"),
  };
}

async function main() {
  if (existsSync(".env.local") && typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");
  const args = parseArguments(process.argv.slice(2));
  const projectRef = parseDevelopmentTarget(process.env.SUPABASE_URL);
  if (!process.env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_SECRET_KEY is required in the environment");
  const input = parseBootstrapInput(args.input);
  console.log(["Target: Development Supabase", `Project ref: ${projectRef}`, `Account: ${input.email}`, `Academic Year: ${input.year} (${input.startDate} – ${input.endDate})`, `Officer Position: ${input.title}`, args.dryRun ? "Mode: dry-run" : "Mode: apply"].join("\n"));
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  const result = await bootstrapDevelopmentAdmin(input, createSupabaseBootstrapAdapter(supabase), args);
  console.log(result.dryRun ? "Dry-run complete; no writes performed." : "Development Admin bootstrap complete.");
  console.log(JSON.stringify(result.plan));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Development bootstrap failed");
    process.exitCode = 1;
  });
}
