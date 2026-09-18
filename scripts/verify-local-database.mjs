import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(resolve(root, "supabase/verification/verify-reproducible-schema.sql"), "utf8");
const container = process.env.SUPABASE_DB_CONTAINER || "supabase_db_ntust-bgc";
const result = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X"], {
  cwd: root,
  input: sql,
  encoding: "utf8",
  stdio: ["pipe", "inherit", "inherit"],
  shell: process.platform === "win32",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);