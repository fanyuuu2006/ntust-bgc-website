import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "./helpers/load-app-module.mjs";
import * as React from "react";

const base = { "@/libs/observability/server-render": { withServerErrorReference: (fn) => fn } };
const readSource = (path) => readFile(path, "utf8");
function nodes(node) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children), ...nodes(node.props?.actions), ...nodes(node.props?.breadcrumb), ...nodes(node.props?.items)]; }

test("dashboard server counts and operational CTA ordering", async () => {
  const calls=[];
  const {default: Page}=load("src/app/(admin)/admin/page.tsx", {...base, "@/services/board-games/board-games.service": {boardGamesService: {countAllBoardGames:async()=>607, countBorrowingsByStatus:async s=>{calls.push(s);return 1;}, countOverdueBorrowings:async()=>2}}});
  await Page();
  assert.deepEqual(calls,["pending","approved","borrowed"]);
});

test("admin overview exposes separated work queue and operations", async () => {
  const page = await readSource("src/app/(admin)/admin/page.tsx");
  const queue = await readSource("src/components/(admin)/admin/AdminAttentionQueue.tsx");
  assert.match(page, /AdminAttentionQueue/);
  assert.match(page, /AdminQuickLinks/);
  assert.match(page, /admin-status-title/);
  assert.match(queue, /status=pending/);
  assert.match(queue, /overdue=true/);
});

test("operational status selection preserves list context and removes stale overdue filter", () => {
  const paths=[];
  const {AdminBorrowingFilters}=load("src/components/(admin)/admin/borrowings/AdminBorrowingFilters.tsx", { "next/navigation": {useRouter: () => ({push: path => paths.push(path)})} });
  const tree=AdminBorrowingFilters({query:{status:"borrowed",overdue:"true",search:"game",page:4,pageSize:50,orderBy:"due_at",orderDirection:"asc"}});
  const select=nodes(tree).find(n=>typeof n.props?.onChange === "function");
  for(const value of ["pending","approved","borrowed","overdue",""]) select.props.onChange({target:{value}});
  for(const [i,path] of paths.entries()) { const q=new URL(path,"https://local").searchParams; assert.equal(q.get("page"),"1"); assert.equal(q.get("pageSize"),"50"); assert.equal(q.get("search"),"game"); assert.equal(q.get("orderBy"),"due_at"); assert.equal(q.get("overdue"),i===3?"true":null); }
});

test("overdue service delegates a server timestamp and borrowed status",async()=>{ let args; const {boardGamesService}=load("src/services/board-games/board-games.service.ts", {"@/libs/supabase/server":{supabase:{}}, "@/repositories/board-game-borrowings.repository":{boardGameBorrowingsRepository:{countByStatus:async(...values)=>{args=values;return 5;}}}}); const before=Date.now(); assert.equal(await boardGamesService.countOverdueBorrowings(),5); assert.equal(args[0],"borrowed"); assert.ok(Date.parse(args[1])>=before); });

test("overdue query accepts only the owned derived filter",()=>{ const {listBorrowingsQuerySchema:s}=load("src/services/board-games/board-games.schema.ts"); assert.equal(s.parse({overdue:"true",status:"borrowed",orderBy:"due_at"}).overdue,"true"); assert.equal(s.parse({overdue:"false"}).overdue,undefined); assert.equal(s.parse({status:"overdue"}).status,undefined); });

test("overdue list and count constrain SQL before pagination", async()=>{ const calls=[]; const q={then(resolve){return Promise.resolve({data:[],count:2,error:null}).then(resolve)}}; for(const method of ["select","eq","lt","order","range"]) q[method]=(...args)=>{calls.push([method,...args]);return q}; const {boardGameBorrowingsRepository:r}=load("src/repositories/board-game-borrowings.repository.ts",{"@/libs/supabase/server":{supabase:{from:()=>q}}}); await r.findMany({overdue:"true",orderBy:"due_at",orderDirection:"asc"}); assert.ok(calls.some(c=>c[0]==="eq"&&c[1]==="status"&&c[2]==="borrowed")); assert.ok(calls.findIndex(c=>c[0]==="lt")<calls.findIndex(c=>c[0]==="range")); calls.length=0; await r.countByStatus("borrowed","2026-09-13T00:00:00.000Z"); assert.ok(calls.some(c=>c[0]==="select"&&c[2].head===true)); assert.deepEqual(calls.find(c=>c[0]==="lt"),["lt","due_at","2026-09-13T00:00:00.000Z"]); });

const user={id:"user-1",name:"long-username",email:"member@example.test",avatar:null,profile:{real_name:"測試使用者"},created_at:"2026-09-01T00:00:00Z",updated_at:"2026-09-01T00:00:00Z",memberships:[],officer_positions:[]};
test("canonical avatar supports stored image and fallback",()=>{ const {UserAvatar}=load("src/components/UserAvatar.tsx"); assert.match(renderToStaticMarkup(React.createElement(UserAvatar,{user:{...user,avatar:"/avatar.png"}})),/src="\/avatar.png"/); assert.match(renderToStaticMarkup(React.createElement(UserAvatar,{user})),/<svg/); });
for(const status of ["active","expired",null]) test(`unverified latest-mail state: ${status}`,async()=>{ const {default:Page}=load("src/app/(admin)/admin/users/[id]/page.tsx",{...base,"@/services/users/users.service":{usersService:{getActivityCountsForAdmin:async()=>({borrowings:0,openBorrowings:0,attendances:0}),getUserForAdmin:async()=>({...user,email_verified_at:null})}},"@/services/email-verification/email-verification-operations.service":{getLatestVerificationForAdmin:async()=>status?{status,created_at:user.created_at,expires_at:user.created_at,consumed_at:null}:null}}); const tree=await Page({params:Promise.resolve({id:user.id}),searchParams:Promise.resolve({returnTo:"/admin/users?emailVerification=unverified&page=3"})}); assert.match(JSON.stringify(tree),/emailVerification=unverified/); });
test("user list reuses canonical avatars and preserves verification query",async()=>{ const {default:Page}=load("src/app/(admin)/admin/users/page.tsx",{...base,"@/services/users/users.service":{usersService:{listForAdmin:async()=>({data:[user],total:1,totalPages:1})}}}); const tree=await Page({searchParams:Promise.resolve({emailVerification:"unverified",search:"long"})}); assert.ok(nodes(tree).some(n=>n.props?.href?.includes("returnTo="))); });
for(const verified of [true,false]) test(`latest mail visibility: verified=${verified}`,async()=>{ let calls=0; const {default:Page}=load("src/app/(admin)/admin/users/[id]/page.tsx",{...base,"@/services/users/users.service":{usersService:{getActivityCountsForAdmin:async()=>({borrowings:0,openBorrowings:0,attendances:0}),getUserForAdmin:async()=>({...user,email_verified_at:verified?user.created_at:null})}},"@/services/email-verification/email-verification-operations.service":{getLatestVerificationForAdmin:async()=>{calls++;return {status:"consumed",created_at:user.created_at,expires_at:user.created_at,consumed_at:user.created_at}}}}); const tree=await Page({params:Promise.resolve({id:user.id}),searchParams:Promise.resolve({})}); assert.equal(calls,verified?0:1); assert.doesNotMatch(JSON.stringify(tree),/token_hash|rawToken/); });
test("admin overview separates queue from operational summary", async()=>{ const {default:Page}=load("src/app/(admin)/admin/page.tsx",{...base,"@/services/board-games/board-games.service":{boardGamesService:{countAllBoardGames:async()=>607,countBorrowingsByStatus:async()=>1,countOverdueBorrowings:async()=>2}}}); const html=renderToStaticMarkup(await Page()); assert.match(html,/管理總覽/); assert.match(html,/待處理事項/); assert.match(html,/近期活動/); assert.match(html,/營運概況/); assert.match(html,/逾期借用/); });
for (const overdue of [0, 2]) test(`admin overview keeps queue and summary distinct: ${overdue}`, async()=>{ const {default:Page}=load("src/app/(admin)/admin/page.tsx",{...base,"@/services/board-games/board-games.service":{boardGamesService:{countAllBoardGames:async()=>607,countBorrowingsByStatus:async()=>1,countOverdueBorrowings:async()=>overdue}}}); const html=renderToStaticMarkup(await Page()); assert.match(html,/管理總覽/); assert.match(html,/待處理事項/); assert.match(html,/營運概況/); assert.doesNotMatch(html,/借用流程/); });
