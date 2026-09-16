import assert from "node:assert/strict";
import { File } from "node:buffer";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { load } from "./helpers/load-app-module.mjs";

process.env.SUPABASE_URL = "https://project-ref.supabase.co";

const USER_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_ID = "223e4567-e89b-42d3-a456-426614174000";
const OBJECT_ID = "323e4567-e89b-42d3-a456-426614174000";
const signatures = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};

test("shared signature detection identifies only JPEG PNG and WebP", () => {
  const { detectSupportedImage } = load("src/libs/images/file-signature.ts");
  assert.deepEqual(detectSupportedImage(Uint8Array.from(signatures["image/jpeg"])), { mimeType: "image/jpeg", extension: "jpg" });
  assert.deepEqual(detectSupportedImage(Uint8Array.from(signatures["image/png"])), { mimeType: "image/png", extension: "png" });
  assert.deepEqual(detectSupportedImage(Uint8Array.from(signatures["image/webp"])), { mimeType: "image/webp", extension: "webp" });
  assert.equal(detectSupportedImage(Uint8Array.from([0x47, 0x49, 0x46, 0x38])), null);
});

test("avatar canonical contract binds HTTPS origin bucket owner and UUIDv4 filename", () => {
  const avatar = load("src/libs/avatar/image.ts");
  const path = avatar.createAvatarObjectPath(USER_ID, "webp", OBJECT_ID);
  const url = avatar.buildAvatarPublicUrl(path, process.env.SUPABASE_URL);
  assert.equal(path, `${USER_ID}/${OBJECT_ID}.webp`);
  assert.deepEqual(avatar.parseOwnedAvatarUrl(url, USER_ID, process.env.SUPABASE_URL), { objectPath: path, extension: "webp" });
  for (const unsafe of [
    url.replace("project-ref", "foreign-project"),
    url.replace("/avatars/", "/rich-content-images/"),
    url.replace(USER_ID, OTHER_ID),
    url.replace(OBJECT_ID, "not-a-uuid"),
    url.replace(".webp", ".gif"),
    `${url}?token=x`, `${url}#x`,
    `https://user:secret@project-ref.supabase.co/storage/v1/object/public/avatars/${path}`,
    `https://project-ref.supabase.co/storage/v1/object/public/avatars/${USER_ID}/../${OBJECT_ID}.webp`,
    `https://project-ref.supabase.co/storage/v1/object/public/avatars/${USER_ID}/%2e%2e/${OBJECT_ID}.webp`,
  ]) assert.equal(avatar.parseOwnedAvatarUrl(unsafe, USER_ID, process.env.SUPABASE_URL), null, unsafe);
  assert.equal(avatar.parseOwnedAvatarUrl("https://external.example/avatar.jpg", USER_ID, process.env.SUPABASE_URL), null);
});

function avatarServiceHarness({ currentAvatar = null, cas = true, removeError = null } = {}) {
  const uploads = [];
  const removals = [];
  const casCalls = [];
  const errors = [];
  const serviceModule = load("src/services/avatars/avatars.service.ts", {
    "@/repositories/avatar-storage.repository": { avatarStorageRepository: {
      upload: async (...args) => uploads.push(args),
      remove: async (path) => { removals.push(path); if (removeError) throw removeError; },
    } },
    "@/repositories/users.repository": { usersRepository: {
      findById: async () => ({ id: USER_ID, avatar: currentAvatar, closed_at: null }),
      compareAndSwapAvatar: async (...args) => { casCalls.push(args); return cas ? { id: USER_ID, avatar: args[2] } : null; },
    } },
    "@/libs/observability/report": { reportUnexpectedError: (error, context) => errors.push([error, context]) },
  });
  return { ...serviceModule, uploads, removals, casCalls, errors };
}

test("avatar validation accepts matched formats and rejects empty oversized spoofed GIF and SVG", async () => {
  const { validateAvatarFile, AvatarImageInputError } = avatarServiceHarness();
  for (const [type, bytes] of Object.entries(signatures)) {
    const result = await validateAvatarFile(new File([Uint8Array.from(bytes)], "ignored.svg", { type }));
    assert.equal(result.detected.mimeType, type);
  }
  for (const file of [
    new File([], "empty.png", { type: "image/png" }),
    new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    new File([Uint8Array.from(signatures["image/png"])], "spoof.jpg", { type: "image/jpeg" }),
    new File([Uint8Array.from([0x47, 0x49, 0x46, 0x38])], "a.gif", { type: "image/gif" }),
    new File(["<svg><script/></svg>"], "a.svg", { type: "image/svg+xml" }),
  ]) await assert.rejects(() => validateAvatarFile(file), AvatarImageInputError);
});

test("replacement uploads a new object then CAS swaps and deletes only owned old avatar", async () => {
  const model = load("src/libs/avatar/image.ts");
  const oldPath = `${USER_ID}/${OBJECT_ID}.jpg`;
  const oldAvatar = model.buildAvatarPublicUrl(oldPath, process.env.SUPABASE_URL);
  const harness = avatarServiceHarness({ currentAvatar: oldAvatar });
  const result = await harness.avatarsService.replace(USER_ID, new File([Uint8Array.from(signatures["image/png"])], "name.png", { type: "image/png" }));
  assert.equal(harness.uploads.length, 1);
  assert.match(harness.uploads[0][0], new RegExp(`^${USER_ID}/[0-9a-f-]+\\.png$`));
  assert.deepEqual(harness.casCalls, [[USER_ID, oldAvatar, result.avatar]]);
  assert.deepEqual(harness.removals, [oldPath]);
});

test("lost replacement race cleans the new object and returns conflict without deleting current", async () => {
  const harness = avatarServiceHarness({ currentAvatar: "https://external.example/a.jpg", cas: false });
  await assert.rejects(
    () => harness.avatarsService.replace(USER_ID, new File([Uint8Array.from(signatures["image/jpeg"])], "a.jpg", { type: "image/jpeg" })),
    { name: "AvatarMutationConflictError" },
  );
  assert.equal(harness.removals.length, 1);
  assert.equal(harness.removals[0], harness.uploads[0][0]);
});

test("cleanup failure is logged safely and never reverses a successful avatar swap", async () => {
  const cleanupError = new Error("private provider cleanup detail");
  const harness = avatarServiceHarness({
    currentAvatar: "https://external.example/a.jpg",
    removeError: cleanupError,
  });
  // External legacy URLs are detached without any provider deletion attempt.
  assert.match((await harness.avatarsService.replace(USER_ID, new File([Uint8Array.from(signatures["image/png"])], "a.png", { type: "image/png" }))).avatar, /\/avatars\//);
  assert.deepEqual(harness.errors, []);

  const model = load("src/libs/avatar/image.ts");
  const owned = model.buildAvatarPublicUrl(`${USER_ID}/${OBJECT_ID}.webp`, process.env.SUPABASE_URL);
  const ownedHarness = avatarServiceHarness({ currentAvatar: owned, removeError: cleanupError });
  const result = await ownedHarness.avatarsService.replace(USER_ID, new File([Uint8Array.from(signatures["image/jpeg"])], "a.jpg", { type: "image/jpeg" }));
  assert.match(result.avatar, /\.jpg$/);
  assert.equal(ownedHarness.errors.length, 1);
  assert.equal(ownedHarness.errors[0][0], cleanupError);
  assert.deepEqual(ownedHarness.errors[0][1], { context: "avatar.cleanup" });
});

function concurrentServiceHarness(initialAvatar) {
  let avatar = initialAvatar;
  let reads = 0;
  let releaseReads;
  const readBarrier = new Promise((resolve) => { releaseReads = resolve; });
  const uploads = [], removals = [];
  const serviceModule = load("src/services/avatars/avatars.service.ts", {
    "@/repositories/avatar-storage.repository": { avatarStorageRepository: {
      upload: async (path) => uploads.push(path),
      remove: async (path) => removals.push(path),
    } },
    "@/repositories/users.repository": { usersRepository: {
      findById: async () => {
        const observed = avatar;
        reads += 1;
        if (reads === 2) releaseReads();
        await readBarrier;
        return { id: USER_ID, avatar: observed, closed_at: null };
      },
      compareAndSwapAvatar: async (_userId, expected, next) => {
        if (avatar !== expected) return null;
        avatar = next;
        return { id: USER_ID, avatar: next };
      },
    } },
    "@/libs/observability/report": { reportUnexpectedError: () => {} },
  });
  return { ...serviceModule, uploads, removals, current: () => avatar };
}

test("two replacements observing A use CAS so only one becomes authoritative", async () => {
  const harness = concurrentServiceHarness("https://external.example/a.jpg");
  const file = () => new File([Uint8Array.from(signatures["image/png"])], "a.png", { type: "image/png" });
  const settled = await Promise.allSettled([
    harness.avatarsService.replace(USER_ID, file()),
    harness.avatarsService.replace(USER_ID, file()),
  ]);
  assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(settled.filter((result) => result.status === "rejected" && result.reason.name === "AvatarMutationConflictError").length, 1);
  assert.equal(harness.uploads.length, 2);
  assert.equal(harness.removals.length, 1);
  assert.match(harness.current(), /\/avatars\//);
});

test("remove and replace observing A cannot overwrite the CAS winner", async () => {
  const harness = concurrentServiceHarness("https://external.example/a.jpg");
  const settled = await Promise.allSettled([
    harness.avatarsService.replace(USER_ID, new File([Uint8Array.from(signatures["image/webp"])], "a.webp", { type: "image/webp" })),
    harness.avatarsService.remove(USER_ID),
  ]);
  assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(settled.filter((result) => result.status === "rejected" && result.reason.name === "AvatarMutationConflictError").length, 1);
  assert.ok(harness.current() === null || /\/avatars\//.test(harness.current()));
});

test("two replacements from null use a null-safe CAS and only one wins", async () => {
  const harness = concurrentServiceHarness(null);
  const file = () => new File([Uint8Array.from(signatures["image/jpeg"])], "a.jpg", { type: "image/jpeg" });
  const settled = await Promise.allSettled([
    harness.avatarsService.replace(USER_ID, file()),
    harness.avatarsService.replace(USER_ID, file()),
  ]);
  assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(settled.filter((result) => result.status === "rejected").length, 1);
});

test("remove uses the same CAS, is null-idempotent, and never deletes legacy external URLs", async () => {
  const external = avatarServiceHarness({ currentAvatar: "https://external.example/a.jpg" });
  assert.deepEqual(await external.avatarsService.remove(USER_ID), { avatar: null });
  assert.deepEqual(external.casCalls, [[USER_ID, "https://external.example/a.jpg", null]]);
  assert.deepEqual(external.removals, []);

  const empty = avatarServiceHarness({ currentAvatar: null });
  assert.deepEqual(await empty.avatarsService.remove(USER_ID), { avatar: null });
  assert.deepEqual(empty.casCalls, []);
});

test("user repository CAS puts expected avatar and open-account predicates in the mutation", async () => {
  const calls = [];
  const builder = {
    update(value) { calls.push(["update", value]); return this; },
    eq(key, value) { calls.push(["eq", key, value]); return this; },
    is(key, value) { calls.push(["is", key, value]); return this; },
    select(value) { calls.push(["select", value]); return this; },
    maybeSingle: async () => ({ data: { id: USER_ID, avatar: "new" }, error: null }),
  };
  const repository = load("src/repositories/users.repository.ts", {
    "@/libs/supabase/server": { supabase: { from: (table) => { assert.equal(table, "users"); return builder; } } },
  }).usersRepository;
  await repository.compareAndSwapAvatar(USER_ID, null, "new");
  assert.deepEqual(calls.slice(0, 4), [["update", { avatar: "new" }], ["eq", "id", USER_ID], ["is", "closed_at", null], ["is", "avatar", null]]);
  calls.length = 0;
  await repository.compareAndSwapAvatar(USER_ID, "old", null);
  assert.ok(calls.some((call) => call[0] === "eq" && call[1] === "avatar" && call[2] === "old"));
});

test("avatar Storage repository fixes bucket path options and delete list", async () => {
  const calls = [];
  const storage = { from(bucket) { calls.push(["bucket", bucket]); return {
    async upload(...args) { calls.push(["upload", ...args]); return { error: null }; },
    async remove(...args) { calls.push(["remove", ...args]); return { error: null }; },
  }; } };
  const repository = load("src/repositories/avatar-storage.repository.ts", {
    "@/libs/supabase/server": { supabase: { storage } },
  }).avatarStorageRepository;
  const objectPath = `${USER_ID}/${OBJECT_ID}.png`;
  await repository.upload(objectPath, Uint8Array.from(signatures["image/png"]), "image/png");
  await repository.remove(objectPath);
  assert.deepEqual(calls[0], ["bucket", "avatars"]);
  assert.equal(calls[1][3].upsert, false);
  assert.equal(calls[1][3].contentType, "image/png");
  assert.deepEqual(calls.at(-1), ["remove", [objectPath]]);
});

function routeHarness(authorization, service) {
  const errors = [];
  const avatarErrors = load("src/services/avatars/avatars.errors.ts");
  const route = load("src/app/api/users/me/avatar/route.ts", {
    "@/libs/api/verified-authorization": { authorizeVerifiedRequest: async () => authorization },
    "@/services/avatars/avatars.service": { avatarsService: service },
    "@/services/avatars/avatars.errors": avatarErrors,
    "@/libs/api/server-response": { unexpectedErrorResponse: (_, error, message) => { errors.push(error); return Response.json({ message }, { status: 500 }); } },
  });
  return { ...route, errors, avatarErrors };
}

function uploadRequest(entries = [["file", new File([Uint8Array.from(signatures["image/png"])], "a.png", { type: "image/png" })]]) {
  const body = new FormData();
  for (const [key, value] of entries) body.append(key, value);
  return new Request("http://localhost/api/users/me/avatar", { method: "POST", body });
}

test("avatar POST and DELETE use verified authorization and strict multipart", async () => {
  for (const status of [401, 403]) {
    const denied = routeHarness({ user: null, response: new Response(null, { status }) }, { replace: async () => assert.fail(), remove: async () => assert.fail() });
    assert.equal((await denied.POST(uploadRequest())).status, status);
    assert.equal((await denied.DELETE()).status, status);
  }
  const calls = [];
  const allowed = routeHarness({ user: { id: USER_ID }, response: null }, {
    replace: async (...args) => { calls.push(["replace", ...args]); return { avatar: "canonical" }; },
    remove: async (...args) => { calls.push(["remove", ...args]); return { avatar: null }; },
  });
  assert.deepEqual(await (await allowed.POST(uploadRequest())).json(), { data: { avatar: "canonical" } });
  assert.deepEqual(await (await allowed.DELETE()).json(), { data: { avatar: null } });
  assert.equal((await allowed.POST(uploadRequest([["avatar", "x"]]))).status, 400);
  assert.equal((await allowed.POST(uploadRequest([["file", new File(["x"], "a.png")], ["extra", "x"]]))).status, 400);
  assert.equal((await allowed.POST(new Request("http://localhost/api/users/me/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "file=not-a-file",
  }))).status, 400);
  assert.equal(calls.length, 2);
});

test("avatar API authorization is verified-account only and has no membership or officer gate", () => {
  const source = loadText("src/app/api/users/me/avatar/route.ts");
  assert.match(source, /authorizeVerifiedRequest\(\)/);
  assert.doesNotMatch(source, /membership|officer|authorizeAdminRequest/i);
  assert.doesNotMatch(source, /userId|user_id/);
});

test("closed or missing accounts cannot upload or remove avatars", async () => {
  for (const current of [null, { id: USER_ID, avatar: null, closed_at: "2026-09-16T00:00:00Z" }]) {
    const serviceModule = load("src/services/avatars/avatars.service.ts", {
      "@/repositories/avatar-storage.repository": { avatarStorageRepository: {
        upload: async () => assert.fail("closed account uploaded"),
        remove: async () => assert.fail("closed account deleted storage"),
      } },
      "@/repositories/users.repository": { usersRepository: {
        findById: async () => current,
        compareAndSwapAvatar: async () => assert.fail("closed account mutated"),
      } },
      "@/libs/observability/report": { reportUnexpectedError: () => {} },
    });
    const file = new File([Uint8Array.from(signatures["image/png"])], "a.png", { type: "image/png" });
    await assert.rejects(() => serviceModule.avatarsService.replace(USER_ID, file), { name: "AvatarMutationConflictError" });
    await assert.rejects(() => serviceModule.avatarsService.remove(USER_ID), { name: "AvatarMutationConflictError" });
  }
});

test("avatar route maps validation and CAS conflict without exposing provider errors", async () => {
  const input = routeHarness({ user: { id: USER_ID }, response: null }, {
    replace: async () => { throw new input.avatarErrors.AvatarImageInputError("bad image"); },
    remove: async () => ({ avatar: null }),
  });
  assert.equal((await input.POST(uploadRequest())).status, 400);
  const conflict = routeHarness({ user: { id: USER_ID }, response: null }, {
    replace: async () => { throw new conflict.avatarErrors.AvatarMutationConflictError(); },
    remove: async () => { throw new conflict.avatarErrors.AvatarMutationConflictError(); },
  });
  assert.equal((await conflict.POST(uploadRequest())).status, 409);
  assert.equal((await conflict.DELETE()).status, 409);
  const provider = routeHarness({ user: { id: USER_ID }, response: null }, {
    replace: async () => { throw new Error("private provider response"); },
    remove: async () => ({ avatar: null }),
  });
  const response = await provider.POST(uploadRequest());
  assert.equal(response.status, 500);
  assert.doesNotMatch(await response.text(), /private provider/);
  assert.equal(provider.errors.length, 1);
});

test("migration creates only the public 2 MiB avatars bucket without write policies", () => {
  const sql = loadText("supabase/migrations/202609160003_add_avatars_bucket.sql");
  assert.match(sql, /'avatars'[\s\S]*true[\s\S]*2097152/);
  for (const mime of ["image/jpeg", "image/png", "image/webp"]) assert.ok(sql.includes(`'${mime}'`));
  const executable = sql.replace(/--.*$/gm, "");
  assert.doesNotMatch(executable, /create\s+policy|storage\.objects/i);
});

function loadText(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
