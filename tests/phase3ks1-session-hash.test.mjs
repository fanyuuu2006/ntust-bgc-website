import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {load} from './helpers/load-app-module.mjs';
const raw='ab12'.repeat(16), hashed=createHash('sha256').update(raw).digest('hex');
const helper=()=>load('src/utils/auth/session.tsx');
function setup(){
 const calls=[];const row={id:'session',user_id:'user',token_hash:hashed,expires_at:new Date(Date.now()+60000).toISOString(),created_at:'created',last_accessed_at:new Date().toISOString()};
 const errors=load('src/services/auth/auth.errors.tsx');
 const service=load('src/services/auth/auth.service.tsx',{
  '@/libs/supabase/server':{supabase:{}},
  './auth.errors':errors,
  '@/utils/auth/session':{...helper(),generateSessionToken:()=>raw},
  '@/utils/auth/password':{verifyPassword:async()=>true,hashPassword:async()=> 'password-hash'},
  '@/repositories/users.repository':{usersRepository:{findByEmail:async()=>({id:'user'}),findById:async()=>({id:'user'})}},
  '@/repositories/auth.repository':{authRepository:{findCredentialByUserId:async()=>({password_hash:'password-hash'}),closeAccount:async(...args)=>calls.push(['close',...args])}},
  '@/repositories/sessions.repository':{sessionRepository:{
   create:async value=>{calls.push(['create',value]);return row;},
   findValidByTokenHash:async value=>{calls.push(['lookup',value]);return row;},
   deleteByTokenHash:async value=>calls.push(['logout',value]),
   findManyByUserId:async()=>[row,{...row,id:'other',token_hash:'different'}],
   findById:async id=>({...row,id,token_hash:id==='session'?hashed:'different'}),
   deleteById:async id=>calls.push(['revoke',id]),
   deleteAllByUserIdExceptTokenHash:async(...args)=>calls.push(['others',...args]),
  }},
 }).authService;
 return {service,calls,errors};
}
test('SHA256 is deterministic, different for different raw values, and cannot be replayed as cookie',()=>{
 const {hashSessionToken}=helper();assert.equal(hashSessionToken(raw),hashed);assert.equal(hashSessionToken(raw),hashed);assert.notEqual(hashSessionToken('other'),hashed);assert.notEqual(hashSessionToken(hashed),hashed);
});
test('login persists only hash and returns raw token separately for cookie',async()=>{
 const {service,calls}=setup();const result=await service.login({email:'test@example.test',password:'Password123!'});
 assert.equal(calls[0][1].token_hash,hashed);assert.equal('token' in calls[0][1],false);assert.equal(result.rawToken,raw);assert.equal(JSON.stringify(result.session).includes(raw),false);
});
test('lookup logout and revoke-others hash at service boundary',async()=>{
 const {service,calls}=setup();await service.getUserBySessionToken(raw);await service.logout(raw);await service.revokeOtherSessions('user',raw);
 assert.deepEqual(calls,[['lookup',hashed],['logout',hashed],['others','user',hashed]]);
});
test('session summaries expose neither hash nor raw and current cannot self-revoke',async()=>{
 const {service,calls,errors}=setup();const result=await service.listSessions('user',raw);
 assert.equal(result[0].is_current,true);assert.equal(result[1].is_current,false);assert.doesNotMatch(JSON.stringify(result),/token/);
 await assert.rejects(()=>service.revokeSession('user','session',raw),errors.CannotRevokeCurrentSessionError);
 await service.revokeSession('user','other',raw);assert.deepEqual(calls,[['revoke','other']]);
});
test('closure hashes credential before repository RPC',async()=>{
 const {service,calls}=setup();await service.closeAccount('user',raw,{currentPassword:'password',confirmation:'註銷帳號'});assert.deepEqual(calls,[['close',hashed,'password-hash']]);
});
test('real SDK query and RPC contain hash only',async()=>{
 const requests=[];const supabase=createClient('https://example.test','fixture',{auth:{persistSession:false},global:{fetch:async(input,init)=>{requests.push({url:String(input),body:init?.body});return Response.json(null);}}});
 const repo=load('src/repositories/sessions.repository.tsx',{'@/libs/supabase/server':{supabase}}).sessionRepository;
 await repo.findValidByTokenHash(hashed);await repo.deleteByTokenHash(hashed);await repo.deleteAllByUserIdExceptTokenHash('user',hashed);
 await load('src/repositories/auth.repository.tsx',{'@/libs/supabase/server':{supabase}}).authRepository.closeAccount(hashed,'password-hash');
 assert.ok(requests.slice(0,3).every(r=>r.url.includes('token_hash')));assert.ok(!JSON.stringify(requests).includes(raw));assert.match(requests[3].url,/close_account_by_session_hash/);
});
test('login API puts raw in cookie only, never hash or raw in response body',async()=>{
 const {POST}=load('src/app/api/auth/login/route.ts',{
  '@/services/auth/auth.service':{authService:{login:async()=>({user:{id:'user',name:'fixture',email:'fixture@example.invalid'},session:{token_hash:hashed,expires_at:new Date(Date.now()+60000).toISOString()},rawToken:raw})}},
  '@/libs/auth':{SESSION_COOKIE_NAME:'bgc_st'},
  '@/libs/security/rate-limit':{checkRateLimit:()=>({allowed:true}),getRequestIp:()=> 'fixture'},
 });
 const response=await POST(new Request('http://localhost/api/auth/login',{method:'POST',body:'{}'}));
 assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),new RegExp(`bgc_st=${raw}`));
 const body=await response.text();assert.ok(!body.includes(raw)&&!body.includes(hashed));
});
test('repository insert whitelist ignores accidental raw extra property; touch uses ID',async()=>{
 const calls=[];const query={insert:x=>{calls.push(['insert',x]);return query;},update:x=>{calls.push(['update',x]);return query;},eq:(...x)=>{calls.push(['eq',...x]);return query;},select:x=>{calls.push(['select',x]);return query;},single:async()=>({data:{id:'fixture'},error:null})};
 const repo=load('src/repositories/sessions.repository.tsx',{'@/libs/supabase/server':{supabase:{from:()=>query}}}).sessionRepository;
 await repo.create({user_id:'user',token_hash:hashed,token:raw,expires_at:'time'});await repo.updateById('session-id',{last_accessed_at:'time'});
 assert.ok(!JSON.stringify(calls).includes(raw));assert.deepEqual(calls[0][1],{user_id:'user',token_hash:hashed,expires_at:'time'});
 assert.ok(calls.some(x=>x[0]==='eq'&&x[1]==='id'&&x[2]==='session-id'));assert.ok(calls.filter(x=>x[0]==='select').every(x=>!x[1].split(',').includes('token')));
});
test('both diagnostic paths redact raw and hash including relative query shape',()=>{
 const server=load('src/libs/observability/server-diagnostic.ts').serverDiagnostic;
 const dev=load('src/libs/observability/development-diagnostics.ts').getDevelopmentDiagnostics;
 for(const value of [raw,hashed]){
  const error={code:'PGRST303',status:401,message:`JWT issued at future ${value} /sessions?token_hash=eq.${value}&token=eq.${value}`};
  assert.ok(!JSON.stringify(server(error)).includes(value));assert.ok(!JSON.stringify(dev(error)).includes(value));
 }
});
