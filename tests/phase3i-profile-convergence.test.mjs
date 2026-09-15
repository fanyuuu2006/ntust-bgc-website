import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers/load-app-module.mjs';
test('public page directly uses canonical hero, badges and footprint without private actions',async()=>{
  const page=load('src/app/(public)/profile/[id]/page.tsx',{'./public-profile':{getPublicProfile:async()=>({identity:{id:'public',name:'名稱',avatar:null},identityBadges:[{label:'115 社員',category:'current-membership'}],clubFootprint:{totalBorrowedCount:0,attendedCount:0,joinedAcademicYear:null}})},'@/services/reviews/reviews.service':{reviewsService:{listPublicByUser:async()=>({data:[],page:1,pageSize:10,total:0,totalPages:0})}}});
  const html=renderToStaticMarkup(await page.default({params:Promise.resolve({id:'public'})}));
  assert.match(html,/115 社員/); assert.match(html,/累積借用桌遊/); assert.match(html,/本學年簽到/); assert.match(html,/尚無社員紀錄/);
  assert.doesNotMatch(html,/編輯資料|真實姓名|Email/);
  for(const path of ['src/app/(authenticated)/profile/page.tsx','src/app/(public)/profile/[id]/page.tsx']){
    const source=readFileSync(path,'utf8');assert.match(source,/ProfileHeroSection/);assert.match(source,/ProfileClubFootprint/);
  }
});
test('public disclosure describes summary not detail publication',()=>{
  const privacy=readFileSync('src/app/(public)/privacy/page.tsx','utf8');
  assert.match(privacy,/社員／幹部身份標籤/); assert.match(privacy,/累積借用次數、本學年簽到次數與加入社團學年度/);assert.match(privacy,/明細不會/);
});
