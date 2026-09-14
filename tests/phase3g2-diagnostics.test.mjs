import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from './helpers/load-app-module.mjs';
import { createClient } from '@supabase/supabase-js';

test('server repository log retains operation and PostgREST diagnostics with the same ID', () => {
  const {reportUnexpectedError}=load('src/libs/observability/report.ts');
  const {RepositoryError}=load('src/repositories/shared/errors.ts');
  const logs=[]; const original=console.error; console.error=(...args)=>logs.push(JSON.parse(args[1]));
  try {
    const error=new RepositoryError('BoardGameBorrowingsRepository.countByStatus',{code:'PGRST204',status:400,message:'Could not find the closed_at column in the schema cache',details:null,hint:'Reload the schema cache'});
    const id=reportUnexpectedError(error,{context:'render',route:'/admin'});
    assert.equal(reportUnexpectedError(error,{context:'render',route:'/admin'}),id);
    assert.equal(logs.length,1); assert.equal(logs[0].errorId,id);
    assert.equal(logs[0].cause.operation,'BoardGameBorrowingsRepository.countByStatus');
    assert.equal(logs[0].cause.cause.type,'PostgrestError');
    assert.equal(logs[0].cause.cause.status,400);
    assert.match(logs[0].cause.cause.message,/closed_at/);
    assert.match(logs[0].cause.cause.hint,/schema cache/);
  } finally {console.error=original;}
});
test('actual SDK count failure reaches server reporter while render output stays generic', async()=>{
  const {createSupabaseFetch}=load('src/libs/supabase/fetch.ts');
  const supabase=createClient('https://example.test','test-key',{global:{fetch:createSupabaseFetch(async()=>Response.json({code:'PGRST204',message:'Could not find the closed_at column in the schema cache',details:null,hint:null},{status:400}))},auth:{persistSession:false}});
  const repository=load('src/repositories/board-game-borrowings.repository.ts',{'@/libs/supabase/server':{supabase}}).boardGameBorrowingsRepository;
  const {withServerErrorReference}=load('src/libs/observability/server-render.ts',{'next/navigation':{unstable_rethrow(){}}});
  const original=console.error,env=process.env.NODE_ENV;const logs=[];console.error=(...args)=>logs.push(JSON.parse(args[1]));process.env.NODE_ENV='production';
  try {
    await assert.rejects(withServerErrorReference(()=>repository.countByStatus('borrowed'),'/admin')(),error=>{
      assert.doesNotMatch(error.message,/closed_at|PGRST|schema/);
      assert.equal(error.digest,'app-error:'+logs[0].errorId);return true;
    });
    assert.equal(logs[0].cause.cause.status,400);
    assert.equal(logs[0].cause.cause.type,'PostgrestError');
    assert.equal(logs[0].cause.operation,'依狀態計算借用紀錄數量失敗');
  } finally {console.error=original;process.env.NODE_ENV=env;}
});
test('uncoded SDK fetch failure keeps network identity without private stack',()=>{
  const {serverDiagnostic}=load('src/libs/observability/server-diagnostic.ts');
  const output=serverDiagnostic({message:'TypeError: fetch failed\nprivate stack',code:''});
  assert.deepEqual(output,{type:'FetchError',message:'fetch failed'});
});
test('browser reporter never adds server diagnostic fields',()=>{
  const originalWindow=globalThis.window,original=console.error;globalThis.window={};const logs=[];console.error=(...args)=>logs.push(args);
  try {
    load('src/libs/observability/report.ts').reportUnexpectedError({name:'RepositoryError',context:'read',cause:{code:'PGRST204',message:'column private_column does not exist',status:400}},{context:'render',route:'/admin'});
    assert.doesNotMatch(JSON.stringify(logs),/private_column|operation|status|message/);
  }finally{console.error=original;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});
test('server sanitizer never serializes request objects, getters, row values or credentials',()=>{
  const {serverDiagnostic}=load('src/libs/observability/server-diagnostic.ts');
  const raw={name:'RepositoryError',context:'read',cause:{code:'23505',message:'duplicate key value violates unique constraint',details:'Key (email)=(private@example.com) already exists. password=secret',hint:'Authorization: Bearer token',body:{password:'secret'}}};
  Object.defineProperty(raw.cause,'stack',{get(){throw Error('must not read');}});
  const output=JSON.stringify(serverDiagnostic(raw));
  assert.doesNotMatch(output,/private@example|secret|Bearer|password|token|body/);
  assert.match(output,/23505/);
});
test('Supabase final error includes HTTP status without retrying PGRST204',async()=>{
  const {createSupabaseFetch}=load('src/libs/supabase/fetch.ts');let calls=0;
  const fetcher=createSupabaseFetch(async()=>{calls++;return Response.json({code:'PGRST204',message:'missing column',details:null,hint:null},{status:400});},async()=>{throw Error('no retry');});
  const response=await fetcher('https://example.com/rest/v1/users');
  assert.equal((await response.json()).status,400);assert.equal(calls,1);
});
