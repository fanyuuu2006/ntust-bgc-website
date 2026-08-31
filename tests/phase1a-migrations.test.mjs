import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("privileged RPC migration restricts execute access and fixes search_path", async () => {
  const sql = await readProjectFile(
    "supabase/migrations/202609010001_harden_privileged_rpc_access.sql",
  );

  assert.equal((sql.match(/set search_path = ''/g) ?? []).length, 3);
  for (const functionName of [
    "register_user",
    "claim_membership_register_key",
    "generate_membership_register_keys",
  ]) {
    assert.match(sql, new RegExp(`revoke all privileges on function public\\.${functionName}`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${functionName}`));
  }
});

test("borrowing migration defines database invariants and locked transactional RPCs", async () => {
  const sql = await readProjectFile(
    "supabase/migrations/202609010002_enforce_borrowing_transaction_integrity.sql",
  );

  assert.match(sql, /board_game_borrowings_one_active_game_idx/);
  assert.match(sql, /board_game_borrowings_one_open_user_game_idx/);
  assert.match(sql, /create function public\.checkout_borrowing/);
  assert.match(sql, /create function public\.return_borrowing/);
  assert.equal((sql.match(/for update;/g) ?? []).length, 4);
  assert.match(sql, /set status = 'borrowed'::public\.borrowing_status/);
  assert.match(sql, /set status = 'returned'::public\.borrowing_status/);
});

test("checkout and return repositories use one transactional RPC each", async () => {
  const repository = await readProjectFile(
    "src/repositories/board-game-borrowings.repository.ts",
  );
  const service = await readProjectFile(
    "src/services/board-games/board-games.service.ts",
  );

  assert.match(repository, /supabase\.rpc\("checkout_borrowing"/);
  assert.match(repository, /supabase\.rpc\("return_borrowing"/);

  const workflowSection = service.slice(service.indexOf("checkOutBorrowing"));
  assert.doesNotMatch(workflowSection, /Promise\.all\(/);
});
