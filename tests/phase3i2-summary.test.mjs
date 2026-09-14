import assert from 'node:assert/strict';
import { test } from 'node:test';
import { load } from './helpers/load-app-module.mjs';
test('public summary uses canonical aggregates and strips internal badge identifiers', async () => {
  const { publicProfileSummaryService } = load('src/services/profile/public-profile-summary.service.ts', {
    '@/repositories/public-footprints.repository': { publicFootprintsRepository: { findMemberships: async()=>[], findOfficers: async()=>[] } },
    '@/repositories/academic-years.repository': { academicYearsRepository: { findCurrent: async()=>null } },
    '@/services/board-games/board-games.service': { boardGamesService: { getTotalBorrowedCount: async()=>2 } },
    '@/services/events/events.service': { eventsService: { getAttendedCountByCurrentAcademicYear: async()=>3 } },
  });
  assert.deepEqual(await publicProfileSummaryService.getSummary('user'), { identityBadges: [], clubFootprint: { totalBorrowedCount: 2, attendedCount: 3, joinedAcademicYear: null } });
});
test('summary repository selects narrow fields and pages without detail records', async()=>{
  const selections=[];
  const query={select:s=>{selections.push(s);return query;},eq:()=>query,order:()=>query,range:async()=>({data:[],error:null})};
  const {publicFootprintsRepository}=load('src/repositories/public-footprints.repository.ts',{'@/libs/supabase/server':{supabase:{from:()=>query}}});
  await publicFootprintsRepository.findMemberships('user');await publicFootprintsRepository.findOfficers('user');
  assert.deepEqual(selections,['id,status,academic_year_id,academic_year:academic_years(year,start_date)','id,title,academic_year:academic_years(year,start_date)']);
});
