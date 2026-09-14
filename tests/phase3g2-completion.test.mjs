import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement,act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers/load-app-module.mjs';
import {JSDOM} from 'jsdom';

test('operation context is an exact fixed allowlist, never arbitrary data',()=>{
 const {RepositoryError}=load('src/repositories/shared/errors.ts');
 const {serverDiagnostic}=load('src/libs/observability/server-diagnostic.ts');
 assert.equal(serverDiagnostic(new RepositoryError('read',{},'borrowings-approved')).operationContext,'borrowings-approved');
 for(const unsafe of ['user@example.com','user-uuid','token=secret',{status:'approved',token:'secret'}]) {
  const result=serverDiagnostic(new RepositoryError('read',{},unsafe));
  assert.equal(result.operationContext,undefined);assert.doesNotMatch(JSON.stringify(result),/secret|user@example/);
 }
});
test('board-game total failure has its own context',async()=>{
 const repo=load('src/repositories/board-games.repository.ts',{'@/libs/supabase/server':{supabase:{from:()=>({select:async()=>({error:{code:'PGRST000'}})})}}}).boardGamesRepository;
 await assert.rejects(()=>repo.countAll(),error=>error.operationContext==='board-games-total');
});
for(const purpose of ['user-lookup','user-session','admin-guard']) test(`user read identifies ${purpose} without identity`,async()=>{
 const builder={select(){return this},eq(){return this},maybeSingle:async()=>({error:{code:'PGRST000'}})};
 const repo=load('src/repositories/users.repository.ts',{'@/libs/supabase/server':{supabase:{from:()=>builder}}}).usersRepository;
 await assert.rejects(()=>repo.findById('private-user-id',purpose),error=>{
  const result=load('src/libs/observability/server-diagnostic.ts').serverDiagnostic(error);
  assert.equal(result.operationContext,purpose);assert.doesNotMatch(JSON.stringify(result),/private-user-id/);return true;
 });
});
for(const [status,before,label] of [['pending',undefined,'borrowings-pending'],['approved',undefined,'borrowings-approved'],['borrowed',undefined,'borrowings-borrowed'],['borrowed','2026-09-14','borrowings-overdue']]) test(`count failure identifies ${label}`,async()=>{
 const builder={select(){return this},eq(){return this},lt(){return this},then(resolve){return Promise.resolve({error:{code:'PGRST204'}}).then(resolve)}};
 const repo=load('src/repositories/board-game-borrowings.repository.ts',{'@/libs/supabase/server':{supabase:{from:()=>builder}}}).boardGameBorrowingsRepository;
 await assert.rejects(()=>repo.countByStatus(status,before),error=>{assert.equal(error.operationContext,label);return true});
});
test('session list uses current-only badge and compact auto-width revoke actions',()=>{
 const {SessionList}=load('src/components/(authenticated)/settings/SessionList.tsx',{'next/navigation':{useRouter:()=>({refresh(){}})}});
 const sessions=[true,false,false].map((current,i)=>({id:String(i),is_current:current,created_at:'2026-09-14T01:00:00Z',last_accessed_at:'2026-09-14T01:00:00Z',expires_at:'2026-09-21T01:00:00Z'}));
 const html=renderToStaticMarkup(createElement(SessionList,{sessions}));
 assert.equal((html.match(/<ul/g)||[]).length,1);assert.equal((html.match(/<li\b/g)||[]).length,3);
 assert.match(html,/目前工作階段/);assert.doesNotMatch(html,/>其他工作階段</);
 const dom=new JSDOM(html);
 const buttons=[...dom.window.document.querySelectorAll('button')].filter(button=>button.textContent.trim()==='撤銷');
 assert.equal(buttons.length,2);
 assert.match(html,/撤銷其他登入工作階段/);
 const metadata=dom.window.document.querySelector('[aria-label="工作階段時間"]');
 assert.doesNotMatch(html,/有效期間/);
 assert.equal(metadata.querySelectorAll('time').length,2);
 assert.match(metadata.textContent,/建立/);assert.match(metadata.textContent,/到期/);
 for(const time of metadata.querySelectorAll('time')) {
  assert.match(time.className,/whitespace-nowrap/);
  assert.match(time.querySelector('.sm\\:hidden')?.textContent ?? time.firstElementChild.textContent,/09\//);
  assert.match(time.lastElementChild.textContent,/2026\//);
 }
 for(const button of buttons) {
  assert.doesNotMatch(button.className,/w-full|order-2|self-end/);
  assert.match(button.parentElement.textContent,/其他登入工作階段/);
  assert.equal(button.parentElement.parentElement.querySelectorAll('[aria-label="工作階段時間"]').length,1);
 }
 const current=dom.window.document.querySelector('li');
 assert.match(current.firstElementChild.textContent,/目前使用中.*目前工作階段/);
 assert.equal(current.querySelectorAll('button').length,0); dom.window.close();
});
test('session actions still require confirmation and call the same individual/global DELETE APIs',async()=>{
 const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost',pretendToBeVisual:true});
 const keys=['window','document','navigator','HTMLElement','Element','Node','DOMException'];
 const originals=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of keys)Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});
 globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'))};
 const {createRoot}=await import('react-dom/client');
 const calls=[];let refreshes=0;
 const {SessionList}=load('src/components/(authenticated)/settings/SessionList.tsx',{
  'next/navigation':{useRouter:()=>({refresh(){refreshes++}})},
  '@/libs/api/client':{apiClient:async(...args)=>{calls.push(args)}},
 });
 const root=createRoot(document.body);
 try{
  await act(async()=>root.render(createElement(SessionList,{sessions:[true,false].map((current,i)=>({id:String(i),is_current:current,created_at:'2026-09-14',last_accessed_at:'2026-09-14',expires_at:'2026-09-21'}))})));
  const click=label=>act(async()=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===label).click());
  await click('撤銷');assert.equal(calls.length,0);await click('取消');assert.equal(calls.length,0);
  await click('撤銷');await click('確認撤銷');
  await click('撤銷其他登入工作階段');await click('確認撤銷');
  assert.deepEqual(calls,[['/api/auth/sessions/1',{method:'DELETE'}],['/api/auth/sessions',{method:'DELETE'}]]);
  assert.equal(refreshes,2);
 }finally{
  await act(async()=>root.unmount());dom.window.close();
  for(const key of keys){const original=originals.get(key);if(original)Object.defineProperty(globalThis,key,original);else delete globalThis[key]}
  delete globalThis.requestAnimationFrame;delete globalThis.IS_REACT_ACT_ENVIRONMENT;
 }
});
