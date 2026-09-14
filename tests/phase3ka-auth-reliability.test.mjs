import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { load } from './helpers/load-app-module.mjs';
const url='https://example.test/rest/v1/users';
const failure=(code='PGRST303',message='JWT issued at future')=>Response.json({code,message,details:null,hint:null},{status:401});
const factory=()=>load('src/libs/supabase/fetch.ts').createSupabaseFetch;
test('JWT diagnostic redacts credentials and email while retaining timing classification',()=>{
  const secret='abcdef12'.repeat(8);
  const result=load('src/libs/observability/server-diagnostic.ts').serverDiagnostic({status:401,code:'PGRST303',message:`JWT issued at future ${secret} someone@example.test sb_secret_fixture`,retryAttempted:true});
  assert.match(result.message,/JWT issued at future/);assert.doesNotMatch(JSON.stringify(result),new RegExp(`${secret}|someone@example|sb_secret_fixture`));
});

test('actual SDK REST secret key uses apikey only through application transport',async()=>{
  const key='sb_secret_test_fixture';let captured;
  const client=createClient('https://example.test',key,{auth:{persistSession:false},global:{fetch:factory()(async(_,init)=>{captured=new Headers(init.headers);return Response.json([]);})}});
  await client.from('users').select('id').limit(0);
  assert.equal(captured.get('apikey'),key);assert.equal(captured.has('authorization'),false);
});
test('header normalization preserves user JWT, legacy keys and Request input',async()=>{
  for(const [key,bearer,expected] of [['sb_secret_fixture','sb_secret_fixture',null],['sb_secret_fixture','user.jwt.fixture','Bearer user.jwt.fixture'],['legacy.jwt.fixture','legacy.jwt.fixture','Bearer legacy.jwt.fixture']]){
    let headers;await factory()(async(input,init)=>{headers=new Headers(init?.headers??input.headers);return Response.json([]);})(new Request(url,{headers:{apikey:key,authorization:`Bearer ${bearer}`}}));
    assert.equal(headers.get('authorization'),expected);
  }
});
for(const method of ['GET','HEAD']) test(`${method} timing failure retries once with data and no incident`,async()=>{
  const calls=[],delays=[],logs=[];const original=console.error;console.error=(...x)=>logs.push(x);
  try{const response=await factory()(async(input,init)=>{calls.push({input,init});return calls.length===1?failure():Response.json([{id:1}]);},async ms=>delays.push(ms))(url,{method});
    assert.deepEqual(await response.json(),[{id:1}]);assert.equal(calls.length,2);assert.deepEqual(delays,[100]);assert.equal(logs.length,0);
    assert.ok(calls[1].init.signal);assert.equal(calls[1].init.cache,'no-store');assert.notEqual(calls[0].init?.signal,calls[1].init.signal);
  }finally{console.error=original;}
});
for(const [method,code,message] of [['GET','PGRST301','JWT issued at future'],['GET','PGRST303','Invalid JWT'],['GET','OTHER','Unauthorized'],['POST','PGRST303','JWT issued at future'],['PATCH','PGRST303','JWT issued at future'],['DELETE','PGRST303','JWT issued at future']]) test(`${method} ${code} ${message} is not retried`,async()=>{
  let calls=0;await factory()(async()=>{calls++;return failure(code,message);},async()=>assert.fail('retry forbidden'))(url,{method});assert.equal(calls,1);
});
test('exhausted SDK retry preserves status/code and safe retry diagnostics',async()=>{
  let calls=0;const client=createClient('https://example.test','sb_secret_fixture',{auth:{persistSession:false},global:{fetch:factory()(async()=>{calls++;return failure();},async()=>{})}});
  const {error}=await client.from('users').select('id');assert.equal(calls,2);
  const diagnostic=load('src/libs/observability/server-diagnostic.ts').serverDiagnostic(error);
  assert.equal(diagnostic.type,'PostgrestError');assert.equal(diagnostic.status,401);assert.equal(diagnostic.code,'PGRST303');assert.equal(diagnostic.retryAttempted,true);assert.equal(diagnostic.retrySucceeded,false);
  assert.doesNotMatch(JSON.stringify(diagnostic),/sb_secret|authorization|cookie/i);
});
test('actual Next dedupe implementation bypasses cached first failure on retry',async()=>{
  const require=createRequire(import.meta.url),file=require.resolve('next/dist/server/lib/dedupe-fetch');const mod={exports:{}};
  new Function('require','module','exports',readFileSync(file,'utf8'))(id=>id==='react'?{cache:fn=>{const map=new Map();return key=>{if(!map.has(key))map.set(key,fn(key));return map.get(key);};}}:createRequire(file)(id),mod,mod.exports);
  let network=0;const deduped=mod.exports.createDedupeFetch(async()=>++network===1?failure():Response.json([]));
  await deduped(url);await deduped(url);assert.equal(network,1);
  const response=await factory()(deduped,async()=>{})(url);assert.equal(response.status,200);assert.equal(network,2);
});
test('timing infrastructure maps to sanitized 503 with Error ID rather than user 401',async()=>{
  const {unexpectedErrorResponse}=load('src/libs/api/server-response.ts',{'@/libs/observability/report':{reportUnexpectedError:()=> 'fixture-error-id'}});
  const response=unexpectedErrorResponse('[GET /api/auth/me]',{cause:{code:'PGRST303',status:401,message:'JWT issued at future'}},'original');
  assert.equal(response.status,503);const body=await response.json();assert.equal(body.errorId,'fixture-error-id');assert.doesNotMatch(JSON.stringify(body),/PGRST|JWT|original/);
});
test('session lookup failure propagates without cookie mutation; missing/closed remains null',async()=>{
  const unavailable={code:'PGRST303',status:401,message:'JWT issued at future'};
  const service=load('src/services/auth/auth.service.tsx',{'@/libs/supabase/server':{supabase:{}},'@/repositories/sessions.repository':{sessionRepository:{findValidByTokenHash:async()=>{throw unavailable;}}}}).authService;
  await assert.rejects(()=>service.getUserBySessionToken('fixture'),e=>e===unavailable);
  for(const session of [null,{user_id:'fixture'}]){
    const auth=load('src/services/auth/auth.service.tsx',{'@/libs/supabase/server':{supabase:{}},
      '@/repositories/sessions.repository':{sessionRepository:{findValidByTokenHash:async()=>session}},
      '@/repositories/users.repository':{usersRepository:{findById:async()=>({closed_at:'closed'})}},
    }).authService;
    assert.equal(await auth.getUserBySessionToken('fixture'),null);
  }
  const route=load('src/app/api/auth/me/route.ts',{'@/libs/auth':{getCurrentUser:async()=>{throw unavailable;}},'@/libs/observability/report':{reportUnexpectedError:()=> 'fixture'}});
  const response=await route.GET();assert.equal(response.status,503);assert.equal(response.headers.has('set-cookie'),false);
  assert.equal((await load('src/app/api/auth/me/route.ts',{'@/libs/auth':{getCurrentUser:async()=>null}}).GET()).status,401);
});
test('public viewer degrades without granting permission',async()=>{
  const {RepositoryError}=load('src/repositories/shared/errors.ts');let admin=0;
  const {resolvePublicViewer}=load('src/libs/public-viewer.ts',{
    '@/repositories/shared/errors':{RepositoryError},
    '@/libs/auth':{getCurrentUser:async()=>{throw new RepositoryError('read',{code:'PGRST303',status:401,message:'JWT issued at future'});},isAdminByUserId:async()=>{admin++;return true;}},
    '@/libs/observability/report':{reportUnexpectedError:()=> 'fixture'},
  });
  assert.deepEqual(await resolvePublicViewer(),{status:'unavailable',user:null,isAdmin:false});assert.equal(admin,0);
});
for(const path of ['src/app/(authenticated)/layout.tsx','src/app/(admin)/layout.tsx']) test(`${path} unavailable never redirects or renders protected children`,async()=>{
  const error={status:401,code:'PGRST303',message:'JWT issued at future'};let redirects=0;
  const layout=load(path,{'@/libs/auth':{getCurrentUser:async()=>{throw error;}},'next/navigation':{redirect(){redirects++;throw Error('redirect');}},'@/libs/observability/server-render':{withServerErrorReference:fn=>fn}}).default;
  await assert.rejects(()=>layout({children:'protected'}),e=>e===error);assert.equal(redirects,0);
});
test('admin guard failure after valid user cannot fail open',async()=>{
  const error=new Error('unavailable');let shell=0;
  const layout=load('src/app/(admin)/layout.tsx',{'@/libs/auth':{getCurrentUser:async()=>({email_verified_at:'verified'}),isAdminByUserId:async()=>{throw error;}},'@/components/layouts/AdminShell':{AdminShell:()=>{shell++;}},'@/libs/observability/server-render':{withServerErrorReference:fn=>fn}}).default;
  await assert.rejects(()=>layout({children:'private'}),e=>e===error);assert.equal(shell,0);
});
