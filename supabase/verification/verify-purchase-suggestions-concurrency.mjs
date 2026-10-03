// Explicit opt-in only; never called by npm test or against a hosted database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const database = process.env.PGDATABASE ?? "";
const port = process.env.PGPORT ?? "";
if (process.env.CONFIRM_PURCHASE_QA !== "1" || !/^purchase_suggestions_qa[a-z0-9_]*$/.test(database) || !/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("Requires CONFIRM_PURCHASE_QA=1, PGDATABASE=purchase_suggestions_qa… and explicit local PGPORT");
}
const args = ["-X", "-h", "127.0.0.1", "-p", port, "-U", process.env.PGUSER || "postgres", "-d", database, "-v", "ON_ERROR_STOP=1", "-At"];
function run(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PSQL_PATH || "psql", args, {
      windowsHide: true,
      env: { ...process.env, PGHOSTADDR: "127.0.0.1", PGSERVICE: "", PGOPTIONS: "-c statement_timeout=15000 -c lock_timeout=10000" },
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`QA psql failed: ${stderr}`)));
    child.stdin.end(sql);
  });
}

const users = Array.from({ length: 3 }, () => randomUUID());
const uidList = users.map((id) => `'${id}'`).join(",");
const call = (user, key, name) => `select public.submit_board_game_purchase_suggestion('${user}','${key}','${name}','A synthetic concurrency suggestion only.',null);`;
const outcomes = (values) => values.map((value) => JSON.parse(value));

// This test seeds old timestamps; do not run during the first minute of a week.
assert.equal(await run("select extract(epoch from clock_timestamp() - (date_trunc('week', clock_timestamp() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei')) > 61;"), "t", "Retry after the first minute of the Taipei week");
try {
  await run(users.map((id) => `insert into public.users(id,name,email,email_verified_at) values('${id}','purchase-race','${id}@example.invalid',clock_timestamp());`).join("\n"));

  const requestId = randomUUID();
  const replay = outcomes(await Promise.all(Array.from({ length: 8 }, () => run(call(users[0], requestId, "Same request")))));
  assert.equal(replay.filter((row) => row.replayed === false).length, 1);
  assert.equal(replay.filter((row) => row.replayed === true).length, 7);

  const duplicate = outcomes(await Promise.all(Array.from({ length: 8 }, () => run(call(users[1], randomUUID(), "Same name")))));
  assert.equal(duplicate.filter((row) => row.outcome === "received").length, 1);
  assert.equal(duplicate.filter((row) => row.outcome === "duplicate").length, 7);

  await run(`insert into public.board_game_purchase_suggestions(user_id,request_id,game_name,reason,created_at)
    select '${users[2]}',gen_random_uuid(),'Existing '||n,'Synthetic quota setup only.',date_trunc('week',clock_timestamp() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei'
    from generate_series(1,2) n;`);
  const quota = outcomes(await Promise.all(Array.from({ length: 8 }, (_, index) => run(call(users[2], randomUUID(), `Last slot ${index}`)))));
  assert.equal(quota.filter((row) => row.outcome === "received").length, 1);
  assert.ok(quota.filter((row) => row.outcome !== "received").every((row) => ["weekly_limit", "cooldown"].includes(row.outcome)));
  assert.equal(await run(`select count(*) from public.board_game_purchase_suggestions where user_id='${users[2]}';`), "3");
  console.log("PASS: real multi-connection replay, duplicate and final quota slot races");
} finally {
  // Remove only this run's randomly generated fixture users, never truncate/reset.
  await run(`begin; delete from public.board_game_purchase_suggestions where user_id in (${uidList}); delete from public.users where id in (${uidList}); commit;`);
}
