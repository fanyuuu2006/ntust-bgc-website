// 僅操作固定的隔離本機 QA database；不讀取 production 連線設定。
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, randomInt } from "node:crypto";

function run(sql, onLocked) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", ["-X", "-h", "127.0.0.1", "-p", "55439", "-U", "postgres", "-d", "phase3g_qa", "-v", "ON_ERROR_STOP=1", "-At"], { windowsHide: true });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; if (output.includes("QA_LOCKED")) { onLocked?.(); onLocked = undefined; } });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", reject);
    child.on("exit", code => resolve({ code, output }));
    child.stdin.end(sql);
  });
}
async function ok(sql) { const result = await run(sql); assert.equal(result.code, 0, result.output); return result.output; }
async function seed() {
  const id = randomUUID(), game = randomUUID(), cat = randomUUID(), loc = randomUUID();
  await ok(`insert into public.users(id,name,email) values ('${id}','QA concurrency','${id}@qa.invalid');
    insert into public.auth_credentials(user_id,password_hash) values ('${id}','qa-hash');
    insert into public.sessions(user_id,token,expires_at) values ('${id}','${id}',now()+interval '1 hour');
    insert into public.board_game_categories(id,name) values ('${cat}','QA');
    insert into public.board_game_locations(id,name) values ('${loc}','QA');
    insert into public.board_games(id,name,category_id,location_id,status,inventory_number) values ('${game}','QA','${cat}','${loc}','available',${-randomInt(1000000,2000000000)});`);
  return { id, game };
}

// 第一個交易已註銷但尚未 commit：後來的登入／借用必須等候，且不能重新建立存取。
for (const kind of ["session", "borrowing"]) {
  const { id, game } = await seed();
  let locked;
  const ready = new Promise(resolve => { locked = resolve; });
  const closing = run(`begin; select public.close_account('${id}','qa-hash'); select 'QA_LOCKED'; select pg_sleep(1); commit;`, locked);
  await ready;
  const late = kind === "session"
    ? `insert into public.sessions(user_id,token,expires_at) values ('${id}','${id}-late',now()+interval '1 hour');`
    : `insert into public.board_game_borrowings(user_id,board_game_id,status) values ('${id}','${game}','pending');`;
  const rejected = await run(late);
  assert.equal((await closing).code, 0);
  assert.notEqual(rejected.code, 0);
  assert.match(rejected.output, /ACCOUNT_CLOSED/);
  assert.match(await ok(`select count(*) from public.sessions where user_id='${id}';`), /^0/m);
}

// 借用先取得相同 User lock：註銷等到借用 commit 後必須看見 blocker。
{
  const { id, game } = await seed();
  let locked;
  const ready = new Promise(resolve => { locked = resolve; });
  const borrowing = run(`begin; insert into public.board_game_borrowings(user_id,board_game_id,status) values ('${id}','${game}','pending'); select 'QA_LOCKED'; select pg_sleep(1); commit;`, locked);
  await ready;
  const closing = await run(`select public.close_account('${id}','qa-hash');`);
  assert.equal((await borrowing).code, 0);
  assert.notEqual(closing.code, 0);
  assert.match(closing.output, /OPEN_BORROWINGS/);
  assert.match(await ok(`select closed_at is null from public.users where id='${id}';`), /^t/m);
}
console.log("ACCOUNT CLOSURE CONCURRENCY: 3/3 PASS (local fake records only)");
