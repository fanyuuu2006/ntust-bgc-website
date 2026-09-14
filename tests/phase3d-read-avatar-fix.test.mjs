import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {createClient} from "@supabase/supabase-js";
import {readFileSync} from "node:fs";
import {load} from "./helpers/load-app-module.mjs";
const failure=()=>new Response(JSON.stringify({code:"PGRST303",message:"JWT issued at future"}),{status:401});
for(const kind of ["session","count"]) test(kind+" read recovers through shared SDK fetch boundary",async(t)=>{
 const logs=t.mock.method(console,"error",()=>{});let calls=0;const delays=[];
 const {createSupabaseFetch}=load("src/libs/supabase/fetch.ts");
 const wrapped=createSupabaseFetch(async(input,init)=>{
  calls++;
  if(kind==="count") {assert.equal(init.method,"GET");assert.equal(new URL(input).searchParams.get("limit"),"0");}
  if(calls===1)return failure();
  assert.ok(init.signal,"retry opts out of Next render deduplication");
  return new Response(JSON.stringify(kind==="session"?[{id:"valid-session"}]:[]),{headers:{"content-type":"application/json","content-range":"*/7"}});
 },async ms=>delays.push(ms));
 const supabase=createClient("https://example.test","test-key",{global:{fetch:wrapped},auth:{persistSession:false,autoRefreshToken:false}});
 if(kind==="session") {
  const {sessionRepository:r}=load("src/repositories/sessions.repository.tsx",{"@/libs/supabase/server":{supabase}});
  assert.equal((await r.findValidByTokenHash("controlled-test-token")).id,"valid-session");
 } else {
  const {boardGameBorrowingsRepository:r}=load("src/repositories/board-game-borrowings.repository.ts",{"@/libs/supabase/server":{supabase}});
  assert.equal(await r.countByStatus("borrowed"),7);
 }
 assert.equal(calls,2);assert.deepEqual(delays,[100]);assert.equal(logs.mock.callCount(),0);
});
test("failed session retry propagates technical failure instead of null session",async()=>{
 let calls=0;const {createSupabaseFetch}=load("src/libs/supabase/fetch.ts");
 const supabase=createClient("https://example.test","test-key",{global:{fetch:createSupabaseFetch(async()=>{calls++;return failure()},async()=>{})},auth:{persistSession:false,autoRefreshToken:false}});
 const {sessionRepository:r}=load("src/repositories/sessions.repository.tsx",{"@/libs/supabase/server":{supabase}});
 await assert.rejects(r.findValidByTokenHash("controlled-test-token"),{name:"RepositoryError"});assert.equal(calls,2);
});
test("fallback SVG ids stay distinct when mobile and desktop render the same user",()=>{
 const {UserAvatar}=load("src/components/UserAvatar.tsx");const user={id:"same-user",name:"Test",email:"test@example.test",avatar:null};
 const html=renderToStaticMarkup(createElement("div",null,createElement(UserAvatar,{user,className:"size-9 shrink-0"}),createElement(UserAvatar,{user,className:"size-10 shrink-0"})));
 const ids=[...html.matchAll(/<linearGradient id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,2);assert.equal(new Set(ids).size,2);
 for(const id of ids)assert.ok(html.includes("url(#"+id+")"));
});
test("Admin layout identifies its family and temporary dashboard QA code is absent",()=>{
 assert.match(readFileSync("src/app/(admin)/layout.tsx","utf8"),/withServerErrorReference\(AdminLayout, "\/admin"\)/);
 assert.doesNotMatch(readFileSync("src/app/(admin)/admin/page.tsx","utf8"),/development-fixtures|searchParams/);
});
