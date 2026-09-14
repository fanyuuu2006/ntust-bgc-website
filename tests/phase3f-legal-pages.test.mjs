import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { load } from "./helpers/load-app-module.mjs";
const mocks = {"@/libs/siteConfigs":{siteConfigs:{fullName:"國立臺灣科技大學桌上遊戲研究社",title:"臺科大桌遊社"}}, "next/link":{default:({children,...props})=>React.createElement("a",props,children)}};
function page(name){const Component=load("src/app/(public)/"+name+"/page.tsx",mocks).default;return new JSDOM(renderToStaticMarkup(React.createElement(Component))).window.document;}
test("privacy describes actual account profile and club data categories",()=>{
 const text=page("privacy").body.textContent;
 for(const term of ["顯示名稱","真實姓名","電話","學號","學校","系所","年級","頭像","社員","幹部","借用","簽到","選填"])assert.ok(text.includes(term),term);
});
test("privacy identifies session, verification delivery, embeds and infrastructure",()=>{
 const text=page("privacy").body.textContent;
 for(const term of ["bgc_st","7 天","60 分鐘","Brevo","Supabase","Vercel","Cloudflare Turnstile","YouTube","Bilibili","瀏覽器","第三方","錯誤追蹤碼"])assert.ok(text.includes(term),term);
});
test("privacy rights and retention do not invent automatic deletion",()=>{
 const d=page("privacy"),text=d.body.textContent;
 for(const term of ["複製本","停止蒐集","更正","刪除","依法","自動清除"])assert.ok(text.includes(term),term);
 assert.ok(d.querySelector('a[href="mailto:ntustboardgame@gmail.com"]'));
 assert.doesNotMatch(text,/30 天後自動刪除|長期未使用而清除|隨時一鍵刪除|百分之百安全/);
});
test("terms explain academic-year membership and physical borrowing stages",()=>{
 const text=page("terms").body.textContent;
 for(const term of ["帳號不等於社員資格","當學年度","一般社員","終生社員","申請不代表核准","領取","借出","歸還","費用"])assert.ok(text.includes(term),term);
 assert.doesNotMatch(text,/館藏|借閱|永久自動|線上付款|隨時停權/);
});
test("terms separate third-party rights and reasonable conduct",()=>{
 const d=page("terms"),text=d.body.textContent;
 for(const term of ["原權利人","未經授權","干擾","第三方","維護"])assert.ok(text.includes(term),term);
 assert.ok(d.querySelector('a[href="/privacy"]'));
 assert.doesNotMatch(text,/一概不負責|著作權.*全部.*社團/);
});
for(const name of ["privacy","terms"])test(name+" readable semantic document, working anchors and metadata",()=>{
 const d=page(name);
 assert.equal(d.querySelectorAll("h1").length,1);
 assert.ok(d.querySelector('time[dateTime="2026-09-14"]'));
 assert.ok(d.querySelector("article"));
 for(const a of d.querySelectorAll('a[href^="#"]'))assert.ok(d.getElementById(a.hash.slice(1)));
 assert.ok(d.querySelector('nav[aria-label="本頁內容"]'));
 assert.ok(d.querySelector(name==="privacy"?'a[href="/terms"]':'a[href="/privacy"]'));
 const source=readFileSync("src/app/(public)/"+name+"/page.tsx","utf8");
 assert.match(source,/max-w-3xl/);assert.match(source,/wrap-anywhere/);assert.doesNotMatch(source,/h-screen|overflow-hidden|<Card/);
 const {metadata}=load("src/app/(public)/"+name+"/layout.tsx");
 assert.equal(metadata.alternates.canonical,"/"+name);assert.equal(metadata.title,name==="privacy"?"隱私權政策":"使用條款");
});
test("registration distinguishes privacy notice from agreement; footer routes remain public",()=>{
 const form=readFileSync("src/components/(auth)/register/RegisterForm.tsx","utf8");
 assert.match(form,/已閱讀/);assert.match(form,/使用條款/);assert.doesNotMatch(form,/同意服務條款與隱私權政策/);
 for(const route of ["/privacy","/terms"])assert.ok(readFileSync("src/components/Footer/Footer.tsx","utf8").includes(route));
});
