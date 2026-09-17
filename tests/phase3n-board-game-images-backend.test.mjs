import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { load } from "./helpers/load-app-module.mjs";

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const OBJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGIN = "https://project.supabase.co";
const signatures = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};
const text = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("migration creates only the public 4 MiB board-game-images bucket", () => {
  const sql = text("supabase/migrations/202609170002_add_board_game_images_bucket.sql");
  assert.match(sql, /'board-game-images'[\s\S]*true[\s\S]*4194304/);
  for (const mime of Object.keys(signatures)) assert.ok(sql.includes(`'${mime}'`));
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /create\s+policy|storage\.objects/i);
});

test("canonical parser accepts only the exact owned board-game object", () => {
  const image = load("src/libs/board-game-images/image.ts");
  const path = `${GAME_ID}/${OBJECT_ID}.webp`;
  const canonical = `${ORIGIN}/storage/v1/object/public/board-game-images/${path}`;
  assert.deepEqual(image.parseOwnedBoardGameImageUrl(canonical, GAME_ID, ORIGIN), { objectPath: path, extension: "webp" });
  for (const rejected of [
    canonical.replace(ORIGIN, "https://foreign.example"),
    canonical.replace("board-game-images", "avatars"),
    canonical.replace(GAME_ID, OTHER_ID),
    `${canonical}?token=x`, `${canonical}#x`,
    canonical.replace(`${OBJECT_ID}.webp`, `${OBJECT_ID}.gif`),
    canonical.replace(`${OBJECT_ID}.webp`, `extra/${OBJECT_ID}.webp`),
    `https://user:pass@project.supabase.co/storage/v1/object/public/board-game-images/${path}`,
    "https://external.example/game.jpg",
  ]) assert.equal(image.parseOwnedBoardGameImageUrl(rejected, GAME_ID, ORIGIN), null);
});

test("object paths use board-game owner UUID and detected extension", () => {
  const image = load("src/libs/board-game-images/image.ts");
  assert.equal(image.createBoardGameImageObjectPath(GAME_ID, "jpg", OBJECT_ID), `${GAME_ID}/${OBJECT_ID}.jpg`);
  assert.throws(() => image.createBoardGameImageObjectPath("not-a-uuid", "jpg", OBJECT_ID));
});

test("file validation enforces non-empty, 4 MiB, supported signature and MIME agreement", async () => {
  const { validateBoardGameImageFile } = load("src/services/board-game-images/board-game-images.service.ts", {
    "@/repositories/board-game-image-storage.repository": { boardGameImageStorageRepository: {} },
    "@/repositories/board-games.repository": { boardGamesRepository: {} },
    "@/libs/observability/report": { reportUnexpectedError() {} },
    "@/libs/cache/public-data": { invalidatePublicData() {} },
  });
  for (const [mime, bytes] of Object.entries(signatures)) {
    const result = await validateBoardGameImageFile(new File([Uint8Array.from(bytes)], "ignored.bin", { type: mime }));
    assert.equal(result.detected.mimeType, mime);
  }
  await assert.rejects(() => validateBoardGameImageFile(new File([], "x.png", { type: "image/png" })), { name: "BoardGameImageInputError" });
  await assert.rejects(() => validateBoardGameImageFile(new File([Uint8Array.from(signatures["image/png"])], "x.jpg", { type: "image/jpeg" })), { name: "BoardGameImageInputError" });
  await assert.rejects(() => validateBoardGameImageFile(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "x.png", { type: "image/png" })), { name: "BoardGameImageInputError", message: "圖片檔案不可超過 4 MB" });
  for (const [type, bytes] of [["image/gif", [0x47,0x49,0x46,0x38]], ["image/svg+xml", [0x3c,0x73,0x76,0x67]], ["image/avif", [0,0,0,0,0x66,0x74,0x79,0x70,0x61,0x76,0x69,0x66]]]) {
    await assert.rejects(() => validateBoardGameImageFile(new File([Uint8Array.from(bytes)], "x", { type })), { name: "BoardGameImageInputError" });
  }
});

test("Storage repository fixes bucket, cache, MIME and upsert behavior", async () => {
  const calls = [];
  const storage = { from(bucket) { calls.push(["bucket", bucket]); return {
    async upload(...args) { calls.push(["upload", ...args]); return { error: null }; },
    async remove(...args) { calls.push(["remove", ...args]); return { error: null }; },
  }; } };
  const repository = load("src/repositories/board-game-image-storage.repository.ts", { "@/libs/supabase/server": { supabase: { storage } } }).boardGameImageStorageRepository;
  const path = `${GAME_ID}/${OBJECT_ID}.png`;
  await repository.upload(path, Uint8Array.from(signatures["image/png"]), "image/png");
  await repository.remove(path);
  assert.deepEqual(calls[0], ["bucket", "board-game-images"]);
  assert.deepEqual(calls[1].slice(1,3), [path, Uint8Array.from(signatures["image/png"])]);
  assert.deepEqual(calls[1][3], { contentType: "image/png", cacheControl: "31536000", upsert: false });
  assert.deepEqual(calls.at(-1), ["remove", [path]]);
});

test("repository CAS includes null-safe expected-image predicate in the mutation", async () => {
  const calls = [];
  const builder = { update(v){calls.push(["update",v]);return this;}, eq(k,v){calls.push(["eq",k,v]);return this;}, is(k,v){calls.push(["is",k,v]);return this;}, select(v){calls.push(["select",v]);return this;}, maybeSingle:async()=>({data:{id:GAME_ID,image:"new"},error:null}) };
  const repository = load("src/repositories/board-games.repository.ts", { "@/libs/supabase/server": { supabase: { from:()=>builder } } }).boardGamesRepository;
  await repository.compareAndSwapImage(GAME_ID, null, "new");
  assert.deepEqual(calls.slice(0,3), [["update",{image:"new"}],["eq","id",GAME_ID],["is","image",null]]);
  calls.length=0;
  await repository.compareAndSwapImage(GAME_ID, "old", null);
  assert.ok(calls.some((c)=>c[0]==="eq"&&c[1]==="image"&&c[2]==="old"));
});

function serviceHarness(currentImage) {
  let image = currentImage;
  const uploads = [], removals = [], cas = [];
  const service = load("src/services/board-game-images/board-game-images.service.ts", {
    "@/libs/env": { SUPABASE_URL: ORIGIN },
    "@/repositories/board-game-image-storage.repository": { boardGameImageStorageRepository: {
      upload: async (path) => uploads.push(path), remove: async (path) => removals.push(path),
    } },
    "@/repositories/board-games.repository": { boardGamesRepository: {
      findById: async () => ({ id: GAME_ID, image }),
      compareAndSwapImage: async (_id, expected, next) => { cas.push([expected,next]); if(image!==expected)return {status:"conflict"}; image=next; return {status:"updated",boardGame:{id:GAME_ID,image}}; },
    } },
    "@/libs/observability/report": { reportUnexpectedError() {} },
    "@/libs/cache/public-data": { invalidatePublicData() {} },
  }).boardGameImagesService;
  return { service, uploads, removals, cas, current:()=>image };
}

test("replace and remove preserve legacy URLs and clean only canonical owned objects", async () => {
  const legacy = serviceHarness("https://external.example/game.jpg");
  const result = await legacy.service.replace(GAME_ID, new File([Uint8Array.from(signatures["image/png"])], "x", {type:"image/png"}));
  assert.match(result.image, /board-game-images/);
  assert.deepEqual(legacy.removals, []);
  await legacy.service.remove(GAME_ID);
  assert.equal(legacy.current(), null);
  assert.equal(legacy.removals.length, 1);
  const empty = serviceHarness(null);
  assert.deepEqual(await empty.service.remove(GAME_ID), { image: null });
  assert.deepEqual(empty.cas, []);
});

test("CAS conflict cleans the uploaded loser and never overwrites the winner", async () => {
  const uploaded=[],removed=[];
  const service=load("src/services/board-game-images/board-game-images.service.ts",{
    "@/libs/env":{SUPABASE_URL:ORIGIN},
    "@/repositories/board-game-image-storage.repository":{boardGameImageStorageRepository:{upload:async p=>uploaded.push(p),remove:async p=>removed.push(p)}},
    "@/repositories/board-games.repository":{boardGamesRepository:{findById:async()=>({id:GAME_ID,image:"https://external.example/a.jpg"}),compareAndSwapImage:async()=>({status:"conflict"})}},
    "@/libs/observability/report":{reportUnexpectedError(){}},
    "@/libs/cache/public-data":{invalidatePublicData(){}},
  });
  const file=new File([Uint8Array.from(signatures["image/jpeg"])],"x",{type:"image/jpeg"});
  await assert.rejects(()=>service.boardGameImagesService.replace(GAME_ID,file),{name:"BoardGameImageMutationConflictError"});
  assert.equal(uploaded.length,1);assert.deepEqual(removed,uploaded);
});

test("a target removed after upload is classified as missing and cleans the upload", async () => {
  const removed=[];
  const modules=load("src/services/board-game-images/board-game-images.service.ts",{
    "@/libs/env":{SUPABASE_URL:ORIGIN},
    "@/repositories/board-game-image-storage.repository":{boardGameImageStorageRepository:{upload:async()=>{},remove:async p=>removed.push(p)}},
    "@/repositories/board-games.repository":{boardGamesRepository:{findById:async()=>({id:GAME_ID,image:null}),compareAndSwapImage:async()=>({status:"missing"})}},
    "@/libs/observability/report":{reportUnexpectedError(){}},
    "@/libs/cache/public-data":{invalidatePublicData(){}},
  });
  const file=new File([Uint8Array.from(signatures["image/png"])],"x",{type:"image/png"});
  await assert.rejects(()=>modules.boardGameImagesService.replace(GAME_ID,file),{name:"BoardNotFoundError"});
  assert.equal(removed.length,1);
});

test("database failure cleans the new object and successful cleanup failure does not undo DB state", async () => {
  const removed=[];
  const failing=load("src/services/board-game-images/board-game-images.service.ts",{
    "@/libs/env":{SUPABASE_URL:ORIGIN},
    "@/repositories/board-game-image-storage.repository":{boardGameImageStorageRepository:{upload:async()=>{},remove:async p=>removed.push(p)}},
    "@/repositories/board-games.repository":{boardGamesRepository:{findById:async()=>({id:GAME_ID,image:null}),compareAndSwapImage:async()=>{throw new Error("db unavailable");}}},
    "@/libs/observability/report":{reportUnexpectedError(){}},
    "@/libs/cache/public-data":{invalidatePublicData(){}},
  });
  const file=new File([Uint8Array.from(signatures["image/webp"])],"x",{type:"image/webp"});
  await assert.rejects(()=>failing.boardGameImagesService.replace(GAME_ID,file),/db unavailable/);assert.equal(removed.length,1);

  let current=`${ORIGIN}/storage/v1/object/public/board-game-images/${GAME_ID}/${OBJECT_ID}.png`;
  const cleanupErrors=[];
  const successful=load("src/services/board-game-images/board-game-images.service.ts",{
    "@/libs/env":{SUPABASE_URL:ORIGIN},
    "@/repositories/board-game-image-storage.repository":{boardGameImageStorageRepository:{upload:async()=>{},remove:async()=>{throw new Error("delete failed");}}},
    "@/repositories/board-games.repository":{boardGamesRepository:{findById:async()=>({id:GAME_ID,image:current}),compareAndSwapImage:async(_id,_expected,next)=>{current=next;return{status:"updated",boardGame:{id:GAME_ID,image:next}};}}},
    "@/libs/observability/report":{reportUnexpectedError:e=>cleanupErrors.push(e)},
    "@/libs/cache/public-data":{invalidatePublicData(){}},
  });
  const result=await successful.boardGameImagesService.replace(GAME_ID,file);
  assert.equal(current,result.image);assert.equal(cleanupErrors.length,1);
});

test("generic CRUD schemas reject image while preserving image in read models", () => {
  const { createBoardGameSchema, updateBoardGameSchema } = load("src/services/board-games/board-games.schema.ts");
  const base = { name:"Game", inventory_number:1, category_id:GAME_ID, location_id:OTHER_ID, status:"available" };
  assert.equal(createBoardGameSchema.safeParse({...base,image:"https://example.com/game.jpg"}).success, false);
  assert.equal(updateBoardGameSchema.safeParse({image:"https://example.com/game.jpg"}).success, false);
  assert.equal(createBoardGameSchema.safeParse(base).success, true);
  assert.match(text("src/types/database.tsx"), /image:\s*string\s*\|\s*null/);
});

function routeHarness(authorization, service) {
  const errors = load("src/services/board-game-images/board-game-images.errors.ts");
  const boardErrors = load("src/services/board-games/board-games.errors.tsx");
  return load("src/app/api/admin/board-games/[id]/image/route.ts", {
    "@/libs/api/admin-authorization": { authorizeAdminRequest: async () => authorization },
    "@/libs/api/server-response": { unexpectedErrorResponse: () => Response.json({ message: "safe" }, { status: 500 }) },
    "@/services/board-game-images/board-game-images.errors": errors,
    "@/services/board-games/board-games.errors": boardErrors,
    "@/services/board-game-images/board-game-images.service": { boardGameImagesService: service },
  });
}
function uploadRequest(entries=[["file",new File([Uint8Array.from(signatures["image/png"])],"x.png",{type:"image/png"})]]){
  const body=new FormData();for(const [key,value] of entries)body.append(key,value);
  return new Request("http://localhost/api/admin/board-games/x/image",{method:"POST",body});
}
const context=(id=GAME_ID)=>({params:Promise.resolve({id})});

test("Admin image route enforces authorization, UUID and strict multipart", async () => {
  for(const status of [401,403]){
    const route=routeHarness({user:null,response:new Response(null,{status})},{replace:async()=>assert.fail(),remove:async()=>assert.fail()});
    assert.equal((await route.POST(uploadRequest(),context())).status,status);
    assert.equal((await route.DELETE(new Request("http://localhost"),context())).status,status);
  }
  const calls=[];const route=routeHarness({user:{id:"admin"},response:null},{replace:async(...args)=>{calls.push(["replace",...args]);return{image:"canonical"};},remove:async(...args)=>{calls.push(["remove",...args]);return{image:null};}});
  assert.equal((await route.POST(uploadRequest(),context("bad"))).status,400);
  assert.equal((await route.POST(uploadRequest([["image","x"]]),context())).status,400);
  assert.equal((await route.POST(uploadRequest([["file",new File(["x"],"x")],["extra","x"]]),context())).status,400);
  assert.deepEqual(await (await route.POST(uploadRequest(),context())).json(),{data:{image:"canonical"}});
  assert.deepEqual(await (await route.DELETE(new Request("http://localhost"),context())).json(),{data:{image:null}});
  assert.equal(calls.length,2);
});

test("hard delete captures the image, deletes DB first, then performs owned cleanup", () => {
  const source=text("src/services/board-games/board-games.service.ts");
  const start=source.indexOf("deleteBoardGame: async");
  const end=source.indexOf("/* ============================================================",start);
  const block=source.slice(start,end);
  assert.ok(block.indexOf("getBoardGameById") < block.indexOf("deleteById"));
  assert.ok(block.indexOf("findManyByBoardGameId") < block.indexOf("deleteById"));
  assert.ok(block.indexOf("throw new BoardGameHasOpenBorrowingError") < block.indexOf("deleteById"));
  assert.ok(block.indexOf("deleteById") < block.indexOf("removeOwnedBoardGameImageObject"));
  assert.match(block, /deleteById\(id\)\.catch\(rethrowBoardGameDeleteConflict\)/);
  assert.match(block,/boardGame\.image/);
});

test("hard-delete cleanup helper ignores external URLs and safely tolerates owned cleanup failure", async () => {
  const removals = [], diagnostics = [];
  const { removeOwnedBoardGameImageObject } = load("src/services/board-game-images/board-game-images.service.ts", {
    "@/libs/env": { SUPABASE_URL: ORIGIN },
    "@/repositories/board-game-image-storage.repository": { boardGameImageStorageRepository: {
      remove: async (path) => { removals.push(path); throw new Error("provider detail"); },
    } },
    "@/repositories/board-games.repository": { boardGamesRepository: {} },
    "@/libs/observability/report": { reportUnexpectedError: (_error, context) => diagnostics.push(context) },
    "@/libs/cache/public-data": { invalidatePublicData() {} },
  });
  await removeOwnedBoardGameImageObject(GAME_ID, "https://external.example/legacy.jpg");
  assert.deepEqual(removals, []);
  const path = `${GAME_ID}/${OBJECT_ID}.webp`;
  await removeOwnedBoardGameImageObject(GAME_ID, `${ORIGIN}/storage/v1/object/public/board-game-images/${path}`);
  assert.deepEqual(removals, [path]);
  assert.deepEqual(diagnostics, [{ context: "board-game-image.cleanup" }]);
});
