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
  assert.deepEqual(output,{type:'FetchError',classification:'UNKNOWN_ERROR',message:'fetch failed'});
});
test('rich content failures receive safe operational classifications',()=>{
  const {serverDiagnostic}=load('src/libs/observability/server-diagnostic.ts');
  assert.equal(serverDiagnostic({name:'Error',message:'Rich Content 圖片的 Supabase 公開 origin 設定不一致'}).classification,'CONFIG_ERROR');
  assert.equal(serverDiagnostic({name:'RepositoryError',context:'上傳 Rich Content 圖片失敗',cause:{code:'500',message:'provider detail'}}).classification,'STORAGE_UPLOAD_ERROR');
  assert.equal(serverDiagnostic({name:'Error',message:'arrayBuffer failed while processing file'}).classification,'FILE_PROCESSING_ERROR');
  assert.equal(serverDiagnostic({name:'Error',message:'private provider detail'}).classification,'UNKNOWN_ERROR');
});
test('auth infrastructure classification follows a nested cause without exposing details',()=>{
  const {serverDiagnostic}=load('src/libs/observability/server-diagnostic.ts');
  const output=serverDiagnostic({name:'RepositoryError',context:'session',cause:{code:'PGRST303',message:'JWT issued at future secret'}});
  assert.equal(output.classification,'AUTH_INFRASTRUCTURE_ERROR');
  assert.doesNotMatch(JSON.stringify(output),/secret/);
});
test('rich content upload route remains identifiable without exposing dynamic segments',()=>{
  const {reportUnexpectedError}=load('src/libs/observability/report.ts');
  const logs=[]; const original=console.error; console.error=(...args)=>logs.push(JSON.parse(args[1]));
  try {
    reportUnexpectedError(new Error('provider failure'),{context:'[POST /api/admin/rich-content/images]'});
    assert.equal(logs[0].route,'/api/admin/rich-content/images');
    assert.equal(logs[0].method,'POST');
  } finally { console.error=original; }
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
