import assert from "node:assert/strict";
import { File } from "node:buffer";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { load } from "./helpers/load-app-module.mjs";

const TARGET = "123e4567-e89b-42d3-a456-426614174000";
const PNG = new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "avatar.png", { type: "image/png" });

function uploadRequest(entries = [["file", PNG]]) {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return new Request(`http://localhost/api/admin/users/${TARGET}/avatar`, { method: "POST", body: form });
}

function route({ response = null, replace, remove, errors = load("src/services/avatars/avatars.errors.ts") } = {}) {
  const calls = [];
  const routeModule = load("src/app/api/admin/users/[id]/avatar/route.ts", {
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async (...args) => { calls.push(["authorize", ...args]); return { response }; } },
    "@/services/avatars/avatars.errors": errors,
    "@/services/avatars/avatars.service": { avatarsService: {
      replace: replace ?? (async (...args) => { calls.push(["replace", ...args]); return { avatar: "canonical" }; }),
      remove: remove ?? (async (...args) => { calls.push(["remove", ...args]); return { avatar: null }; }),
    } },
  });
  const params = { params: Promise.resolve({ id: TARGET }) };
  return { ...routeModule, params, calls };
}

test("Admin Avatar endpoints authorize before reading target or mutating", async () => {
  for (const status of [401, 403]) {
    const denied = route({ response: Response.json({}, { status }) });
    assert.equal((await denied.POST(uploadRequest(), denied.params)).status, status);
    assert.equal((await denied.DELETE(new Request("http://localhost"), denied.params)).status, status);
    assert.deepEqual(denied.calls.map((call) => call[0]), ["authorize", "authorize"]);
  }
});

test("Admin route derives the Avatar owner only from the route and uses the shared lifecycle", async () => {
  const allowed = route();
  const post = await allowed.POST(uploadRequest(), allowed.params);
  const del = await allowed.DELETE(new Request("http://localhost", { method: "DELETE" }), allowed.params);
  assert.equal(post.status, 201); assert.equal(del.status, 200);
  assert.equal(allowed.calls[1][0], "replace"); assert.equal(allowed.calls[1][1], TARGET);
  assert.equal(allowed.calls[1][2].name, PNG.name); assert.equal(allowed.calls[1][2].type, PNG.type); assert.equal(allowed.calls[1][2].size, PNG.size);
  assert.deepEqual(allowed.calls[3], ["remove", TARGET]);
});

test("Admin upload rejects malformed target and strict multipart violations", async () => {
  const allowed = route();
  assert.equal((await allowed.POST(uploadRequest(), { params: Promise.resolve({ id: "not-a-user" }) })).status, 400);
  assert.equal((await allowed.POST(uploadRequest([["avatar", PNG]]), allowed.params)).status, 400);
  assert.equal((await allowed.POST(uploadRequest([["file", PNG], ["extra", "x"]]), allowed.params)).status, 400);
  assert.equal((await allowed.POST(new Request("http://localhost", { method: "POST", body: "x" }), allowed.params)).status, 400);
});

test("closed target and CAS conflicts are returned as 409 without provider details", async () => {
  const errors = load("src/services/avatars/avatars.errors.ts");
  const conflict = route({ errors,
    replace: async () => { throw new errors.AvatarMutationConflictError(); },
    remove: async () => { throw new errors.AvatarMutationConflictError(); },
  });
  assert.equal((await conflict.POST(uploadRequest(), conflict.params)).status, 409);
  assert.equal((await conflict.DELETE(new Request("http://localhost"), conflict.params)).status, 409);
});

test("Admin Avatar provider failures use the safe 500 boundary", async () => {
  const failed = route({ replace: async () => { throw new Error("provider-secret-body"); } });
  const response = await failed.POST(uploadRequest(), failed.params);
  assert.equal(response.status, 500);
  assert.doesNotMatch(JSON.stringify(await response.json()), /provider-secret-body/);
});

test("Admin authorization remains verified historical-Officer based", () => {
  const source = readFileSync("src/libs/api/admin-authorization.ts", "utf8");
  assert.match(source, /authorizeVerifiedRequest/);
  assert.match(source, /isAdminByUserId/);
  assert.doesNotMatch(source, /membership/i);
});

test("Admin detail uses compact shared Avatar management and ordinary account edits cannot write URLs", () => {
  const page = readFileSync("src/app/(admin)/admin/users/[id]/page.tsx", "utf8");
  const editor = readFileSync("src/components/(admin)/admin/users/UserAccountEditButton.tsx", "utf8");
  const schema = readFileSync("src/services/users/users.schema.tsx", "utf8");
  assert.match(page, /AvatarManagement/); assert.match(page, /api\/admin\/users\/\$\{user\.id\}\/avatar/);
  assert.doesNotMatch(editor, /頭像網址|admin-account-avatar|values?\.avatar|setAvatar/);
  assert.doesNotMatch(schema.slice(schema.indexOf("updateUserAccountSchema"), schema.indexOf("adminUserPickerSearchSchema")), /avatar/);
});
