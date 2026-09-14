import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from './helpers/load-app-module.mjs';
const id='00000000-0000-4000-8000-000000000001';
test('closed public profile never queries badges or aggregates', async()=>{
  const service=load('src/services/users/public-identity.service.ts',{
    '@/repositories/public-identities.repository':{publicIdentitiesRepository:{findById:async()=>({id,name:'OLD',avatar:'https://old.invalid',closed_at:'date',email:'SECRET'})}},
    '@/services/profile/public-profile-summary.service':{publicProfileSummaryService:{getSummary:()=>{throw Error('must not query')}}},
  }).publicIdentityService;
  assert.deepEqual(await service.findProfileById(id),{identity:{id,name:'已註銷使用者',avatar:null},identityBadges:[],clubFootprint:null});
});
test('public summary badges follow private ordering but expose no row IDs or detail fields',async()=>{
  const current={id:'YEAR',year:'115',start_date:'2026-08-01'};
  const old={year:'114',start_date:'2025-08-01'};
  const {publicProfileSummaryService}=load('src/services/profile/public-profile-summary.service.ts',{
    '@/repositories/public-footprints.repository':{publicFootprintsRepository:{
      findMemberships:async()=>[{id:'SECRET',status:'active',academic_year_id:'YEAR',academic_year:current},{id:'SECRET2',status:'expired',academic_year_id:'OLD',academic_year:old}],
      findOfficers:async()=>[{id:'SECRET3',title:'美宣',academic_year:old},{id:'SECRET4',title:'攝影',academic_year:old}],
    }},
    '@/repositories/academic-years.repository':{academicYearsRepository:{findCurrent:async()=>current}},
    '@/services/board-games/board-games.service':{boardGamesService:{getTotalBorrowedCount:async()=>2}},
    '@/services/events/events.service':{eventsService:{getAttendedCountByCurrentAcademicYear:async()=>3}},
  });
  const result=await publicProfileSummaryService.getSummary(id);
  assert.deepEqual(result.identityBadges.map(x=>x.label),['115 社員','114 美宣','114 攝影','114 社員']);
  assert.deepEqual(result.clubFootprint,{totalBorrowedCount:2,attendedCount:3,joinedAcademicYear:'114'});
  for(const badge of result.identityBadges) assert.deepEqual(Object.keys(badge).sort(),['category','label']);
  assert.doesNotMatch(JSON.stringify(result),/SECRET|start_date|academic_year_id|email|phone|student_id|real_name|school|department|grade|sessions|credentials|token/);
});
