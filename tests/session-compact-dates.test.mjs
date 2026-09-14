import assert from 'node:assert/strict';
import {test} from 'node:test';
import {load} from './helpers/load-app-module.mjs';
const {formatCompactDateTimeRange}=load('src/utils/date.tsx');
test('same-year compact dates reuse Taipei time without repeated year',()=>{
 assert.deepEqual(formatCompactDateTimeRange('2026-09-14T07:30:00Z','2026-09-21T07:30:00Z'),{start:'09/14 15:30',end:'09/21 15:30'});
});
test('cross-year dates retain years based on Taipei date, even within same UTC year',()=>{
 assert.deepEqual(formatCompactDateTimeRange('2026-12-31T15:30:00Z','2026-12-31T16:30:00Z'),{start:'2026/12/31 23:30',end:'2027/01/01 00:30'});
});
test('invalid endpoint keeps existing placeholder and does not strip the known year',()=>{
 assert.deepEqual(formatCompactDateTimeRange('invalid','2026-09-21T07:30:00Z'),{start:'—',end:'2026/09/21 15:30'});
});
