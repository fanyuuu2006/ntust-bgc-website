import { spawn } from "node:child_process";

const psql = process.env.PSQL_PATH || "psql";
const connection = ["-X", "-h", "127.0.0.1", "-p", process.env.PGPORT || "55440", "-U", "postgres", "-d", process.env.PGDATABASE || "phase3j_qa", "-v", "ON_ERROR_STOP=1", "-At"];
const ids = {
  user: "30000000-0000-4000-8000-000000000001",
  game: "30000000-0000-4000-8000-000000000002",
  category: "30000000-0000-4000-8000-000000000003",
  location: "30000000-0000-4000-8000-000000000004",
};

function run(sql, allowFailure = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(psql, connection, { windowsHide: true });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (code) => allowFailure || code === 0 ? resolve({ code, output }) : reject(new Error(output)));
    child.stdin.end(sql);
  });
}

await run(`
delete from public.board_game_reviews where user_id='${ids.user}';
delete from public.board_games where id='${ids.game}';
delete from public.board_game_categories where id='${ids.category}';
delete from public.board_game_locations where id='${ids.location}';
delete from public.users where id='${ids.user}';
insert into public.users(id,name,email,email_verified_at) values ('${ids.user}','race','review-race@example.invalid',now());
insert into public.board_game_categories(id,name) values ('${ids.category}','race-category');
insert into public.board_game_locations(id,name) values ('${ids.location}','race-location');
insert into public.board_games(id,name,category_id,location_id,status,inventory_number) values ('${ids.game}','race-game','${ids.category}','${ids.location}','available',-315002);
`);

const first = run(`begin; insert into public.board_game_reviews(board_game_id,user_id,rating) values ('${ids.game}','${ids.user}',5); select pg_sleep(0.5); commit;`);
await new Promise((resolve) => setTimeout(resolve, 100));
const second = run(`insert into public.board_game_reviews(board_game_id,user_id,rating) values ('${ids.game}','${ids.user}',4);`, true);
const [winner, loser] = await Promise.all([first, second]);
if (winner.code !== 0 || loser.code === 0 || !/23505|duplicate key/i.test(loser.output)) {
  throw new Error("Concurrent create did not yield one success and one unique violation");
}
const count = await run(`select count(*) from public.board_game_reviews where board_game_id='${ids.game}' and user_id='${ids.user}';`);
if (count.output.trim() !== "1") throw new Error(`Expected one review row, received ${count.output.trim()}`);

await run(`
delete from public.board_game_reviews where user_id='${ids.user}';
delete from public.board_games where id='${ids.game}';
delete from public.board_game_categories where id='${ids.category}';
delete from public.board_game_locations where id='${ids.location}';
delete from public.users where id='${ids.user}';
`);
console.log("BOARD GAME REVIEWS CONCURRENCY VERIFICATION PASS");
