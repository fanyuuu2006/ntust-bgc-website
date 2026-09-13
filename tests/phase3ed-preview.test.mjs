import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { JSDOM } from 'jsdom';
import { load } from './helpers/load-app-module.mjs';
const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost',pretendToBeVisual:true});
for(const k of ['window','document','navigator','HTMLElement','Element','Node','DOMException']) Object.defineProperty(globalThis,k,{configurable:true,value:dom.window[k]});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new window.Event('close'));}};
const React=await import('react');const {createRoot}=await import('react-dom/client');
after(()=>dom.window.close());
const text=(text)=>({type:'text',text});
const doc=(...content)=>({type:'doc',content});
const paragraph=(value)=>({type:'paragraph',content:[text(value)]});
async function mount(t,value, mocks={}){
 const {RichContentPreview}=load('src/components/RichContentPreview.tsx',mocks);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 let submits=0;const render=(value,title='未儲存標題')=>React.act(async()=>root.render(React.createElement('form',{onSubmit:e=>{e.preventDefault();submits++;}},React.createElement(RichContentPreview,{value,title,label:'公告預覽'}))));
 await render(value);t.after(async()=>{await React.act(async()=>root.unmount());host.remove();});
 const open=()=>React.act(async()=>host.querySelector('button[aria-label="公告預覽"]').click());
 return{host,open,render,get submits(){return submits;}};
}
test('preview uses latest unsaved value/title without submit and unmounts players on close',async(t)=>{
 const ui=await mount(t,doc(paragraph('舊內容')));await ui.render(doc(paragraph('新內容'),{type:'videoEmbed',attrs:{provider:'bilibili',videoId:'BV1JYED6tEff'}}),'新標題');
 assert.equal(ui.host.querySelector('iframe'),null);await ui.open();
 assert.equal(ui.host.querySelector('h1').textContent,'新標題');assert.match(ui.host.textContent,/新內容/);assert.doesNotMatch(ui.host.textContent,/舊內容/);assert.ok(ui.host.querySelector('iframe'));assert.equal(ui.submits,0);
 await React.act(async()=>ui.host.querySelector('button[aria-label="關閉對話框"]').click());assert.equal(ui.host.querySelector('iframe'),null);
 await ui.open();assert.match(ui.host.textContent,/新內容/);assert.equal(ui.submits,0);
});
test('preview renders canonical headings lists quote links and native/provider media',async(t)=>{
 const value=doc(...[2,3,4].map(level=>({type:'heading',attrs:{level},content:[text('Heading')]})),{type:'bulletList',content:[{type:'listItem',content:[paragraph('item')]}]},{type:'blockquote',content:[paragraph('quote')]},{type:'paragraph',content:[{...text('link'),marks:[{type:'link',attrs:{href:'https://example.com'}}]}]},{type:'horizontalRule'},{type:'videoEmbed',attrs:{provider:'youtube',videoId:'dQw4w9WgXcQ'}},{type:'videoEmbed',attrs:{provider:'bilibili',videoId:'BV1JYED6tEff'}},{type:'videoEmbed',attrs:{provider:'direct',src:'https://example.com/a.mp4'}},{type:'audioEmbed',attrs:{src:'https://example.com/a.mp3'}});
 const ui=await mount(t,value);await ui.open();for(const selector of ['h2','h3','h4','ul li','blockquote','a[href="https://example.com"]','hr','video[controls]','audio[controls]'])assert.ok(ui.host.querySelector(selector),selector);
 assert.equal(ui.host.querySelectorAll('iframe').length,2);assert.equal(ui.host.querySelector('[autoplay]'),null);
});
test('empty and invalid preview remain local without showing raw data',async(t)=>{
 const ui=await mount(t,doc({type:'paragraph'}));await ui.open();assert.match(ui.host.textContent,/目前沒有可預覽的內容/);
 await ui.render({type:'doc',content:[{type:'script',secret:'do not render'}]});assert.match(ui.host.textContent,/無法預覽/);assert.doesNotMatch(ui.host.textContent,/do not render/);
});
test('renderer exception is isolated inside preview',async(t)=>{
 let incidents=0;const original=console.error;console.error=()=>{};t.after(()=>{console.error=original;});
 const ui=await mount(t,doc(paragraph('content')),{'@/components/RichTextRenderer':{RichTextRenderer(){throw new Error('private cause');}},'@/libs/observability/report':{reportUnexpectedError(){incidents++;return 'id';}}});await ui.open();assert.match(ui.host.textContent,/無法預覽/);assert.doesNotMatch(ui.host.textContent,/private cause/);assert.equal(incidents,1);assert.ok(ui.host.querySelector('button[aria-label="關閉對話框"]'));
});
for(const [name,path,exportName,props,titleSelector,openLabel,previewLabel] of [
 ['announcement','src/components/(admin)/admin/announcements/AnnouncementEditor.tsx','AnnouncementEditor',{},'#announcement-title',null,'公告預覽'],
 ['board game','src/components/(admin)/admin/board-games/BoardGameForm.tsx','BoardGameForm',{mode:'create',categories:[],locations:[]},'#name',null,'桌遊介紹預覽'],
 ['event edit','src/components/(admin)/admin/events/EventRecords.tsx','EventRecords',{events:[{id:1,name:'活動',description:'舊說明',start_time:'2026-10-01T10:00:00Z',end_time:'2026-10-01T12:00:00Z',check_in_opens_at:null,check_in_closes_at:null}]},'#event-name','編輯','活動說明預覽'],
 ['event','src/components/(admin)/admin/events/EventActions.tsx','EventActions',{},'#event-name','新增活動','活動說明預覽'],
])test(`${name} form preview binds current unsaved name and content without API calls`,async(t)=>{
 let requests=0;
 const Component=load(path,{'next/link':{default:({children,...props})=>React.createElement('a',props,children)},'next/navigation':{useRouter:()=>({push(){},refresh(){}})},'@/libs/api/client':{apiClient:async()=>{requests++;}},'next/dynamic':{default:()=>function EditorStub({onChange}){return React.createElement('button',{type:'button','aria-label':'test edit',onClick:()=>onChange(doc(paragraph('未儲存內容')))},'edit');}}})[exportName];
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await React.act(async()=>root.render(React.createElement(Component,props)));t.after(async()=>{await React.act(async()=>root.unmount());host.remove();});
 if(openLabel)await React.act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent===openLabel).click());
 const input=host.querySelector(titleSelector);assert.ok(input,titleSelector);
 await React.act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'未儲存名稱');input.dispatchEvent(new window.Event('input',{bubbles:true}));host.querySelector('button[aria-label="test edit"]').click();});
 await React.act(async()=>host.querySelector(`button[aria-label="${previewLabel}"]`).click());assert.equal(host.querySelector('h1').textContent,'未儲存名稱');assert.match(host.querySelector('article').textContent,/未儲存內容/);
 const preview=host.querySelector('article').closest('dialog');await React.act(async()=>preview.querySelector('button[aria-label="關閉對話框"]').click());assert.equal(input.value,'未儲存名稱');assert.equal(requests,0);
 if(openLabel)assert.equal(host.querySelector('dialog').open,true,'event form stays open');
});
