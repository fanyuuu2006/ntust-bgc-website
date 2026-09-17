import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {load} from './helpers/load-app-module.mjs';
const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost',pretendToBeVisual:true});
for(const key of ['window','document','navigator','HTMLElement','Element','Node']) Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {createElement,act}=await import('react');const {createRoot}=await import('react-dom/client');
after(()=>dom.window.close());
const initial={name:'桌遊',inventory_number:'608',category_id:'00000000-0000-4000-8000-000000000001',location_id:'00000000-0000-4000-8000-000000000002'};
async function mount(t,mode='create'){
 const calls=[],paths=[];
 const {BoardGameForm}=load('src/components/(admin)/admin/board-games/BoardGameForm.tsx',{'next/navigation':{useRouter:()=>({push:p=>paths.push(p),refresh(){}})},'next/dynamic':{default:()=>props=>createElement('div',{'aria-label':props.label})},'@/libs/api/client':{apiClient:async(...args)=>calls.push(args)}});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(createElement(BoardGameForm,{mode,boardGameId:'game',initialValues:initial,categories:[{id:initial.category_id,name:'策略'}],locations:[{id:initial.location_id,name:'社辦'}],returnTo:'/admin/board-games?page=3&status=available'})));
 t.after(async()=>{await act(async()=>root.unmount());host.remove()});
 return {host,calls,paths};
}
test('board game sections keep status with basics and omit the retired URL image editor',async t=>{
 const {host}=await mount(t);
 const basics=host.querySelector('[aria-labelledby="board-game-basics"]');assert.ok(basics.querySelector('#name').parentElement.parentElement.parentElement === basics.querySelector('#status').parentElement.parentElement);
 assert.ok(host.querySelector('[aria-labelledby="board-game-classification"] #location_id'));
 assert.ok(host.querySelector('[aria-labelledby="board-game-content"] [aria-label="桌遊描述"]'));
 assert.equal(host.querySelector('#image'),null);
 assert.doesNotMatch(host.textContent,/圖片網址/);
});
for(const mode of ['create','edit']) test(`${mode} preserves rich payload and return context without image URL`,async t=>{
 const {host,calls,paths}=await mount(t,mode);await act(async()=>host.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(calls[0][0],mode==='create'?'/api/admin/board-games':'/api/admin/board-games/game');assert.equal(calls[0][1].method,mode==='create'?'POST':'PATCH');
 assert.equal(calls[0][1].body.inventory_number,608);assert.equal('image' in calls[0][1].body,false);assert.equal(calls[0][1].body.description_format,'rich_text_v1');assert.equal(calls[0][1].body.rich_description.type,'doc');
 assert.deepEqual(paths,['/admin/board-games?page=3&status=available']);
});
test('new and edit retain shared form with aligned wider heading and content',()=>{
 for(const path of ['new','[id]/edit']){const source=readFileSync(`src/app/(admin)/admin/board-games/${path}/page.tsx`,'utf8');assert.match(source,/<BoardGameForm/);assert.doesNotMatch(source,/max-w-3xl/);assert.match(source,/max-w-6xl/);}
});
test('cancel preserves list context and required fields remain semantic',async t=>{
 const {host,calls,paths}=await mount(t);
 assert.equal(host.querySelector('#image-error'),null);
 for(const id of ['name','inventory_number','status','category_id','location_id']) assert.equal(host.querySelector('#'+id).required,true);
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='取消').click());assert.deepEqual(paths,['/admin/board-games?page=3&status=available']);
 assert.equal(calls.length,0);
});
