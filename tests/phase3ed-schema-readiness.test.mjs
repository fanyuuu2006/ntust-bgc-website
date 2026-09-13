import assert from 'node:assert/strict';
import { test } from 'node:test';
import {readFileSync} from 'node:fs';
import {load} from './helpers/load-app-module.mjs';
test('rich PATCH derives all three content fields and preserves PGRST204 as a safe incident',async()=>{
 let payload;const cause={code:'PGRST204',message:"Could not find the 'content_format' column of 'announcements' in the schema cache"};
 const query={update(value){payload=value;return this;},eq(){return this;},select(){return this;},maybeSingle:async()=>({data:null,error:cause})};
 const {announcementsRepository}=load('src/repositories/announcements.repository.ts',{'@/libs/supabase/server':{supabase:{from:()=>query}}});
 let captured;
 const original=console.error;console.error=(_tag,value)=>{captured=value;};
 try{
 const {PATCH}=load('src/app/api/admin/announcements/[id]/route.ts',{
 '@/libs/api/admin-authorization':{authorizeAdminRequest:async()=>({user:{id:'author'}})},
 '@/repositories/announcements.repository':{announcementsRepository:{...announcementsRepository,findById:async()=>({id:5,is_published:false,published_at:null})}},
 });
 const response=await PATCH(new Request('http://localhost/api/admin/announcements/5',{method:'PATCH',body:JSON.stringify({title:'title',content_format:'rich_text_v1',rich_content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'new text'}]}]},is_published:false})}),{params:Promise.resolve({id:'5'})});
 assert.equal(payload.content,'new text');assert.equal(payload.content_format,'rich_text_v1');assert.equal(payload.rich_content.type,'doc');
 assert.equal(response.status,500);const body=await response.json();assert.ok(body.errorId);assert.doesNotMatch(JSON.stringify(body),/PGRST204|content_format|schema cache/);assert.match(JSON.stringify(captured),/PGRST204/);assert.match(JSON.stringify(captured),new RegExp(body.errorId));
 }finally{console.error=original;}
});
test('PGRST204 never retries even with a misleading future-JWT message',async()=>{
 const {createSupabaseFetch}=load('src/libs/supabase/fetch.ts');
 for(const method of ['GET','HEAD','PATCH']){let calls=0;const request=createSupabaseFetch(async()=>{calls++;return Response.json({code:'PGRST204',message:'JWT issued at future'},{status:401});},async()=>{assert.fail('unexpected retry');});await request('https://example.com/rest/v1/announcements',{method});assert.equal(calls,1);}
});
test('pending migrations add the required fields without converting legacy text',()=>{
 const announcement=readFileSync('supabase/migrations/202609130001_add_announcement_rich_content.sql','utf8');
 assert.match(announcement,/add column content_format text not null default 'plain_text'/);assert.match(announcement,/add column rich_content jsonb/);
 const descriptions=readFileSync('supabase/migrations/202609130002_add_rich_descriptions.sql','utf8');
 for(const table of ['board_games','events'])assert.match(descriptions,new RegExp('alter table public\\.'+table+'[\\s\\S]*?add column description_format[\\s\\S]*?add column rich_description jsonb'));
 assert.doesNotMatch(announcement+descriptions,/\b(?:update|delete from|drop table)\s+public\./i);
});
