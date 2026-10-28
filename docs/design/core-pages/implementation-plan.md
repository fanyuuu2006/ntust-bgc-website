# Implementation Plan

## Phase A：資料契約與低風險組裝

1. 確認 Public upcoming events 的既有 service／cache 與最小 DTO。
2. 將首頁 Hero、公告、桌遊區塊補上明確 CTA 與一致 loading/empty/error。
3. 不新增 migration；以 Server Component `Promise.all` 控制查詢數量。

驗收：訪客能從首頁一跳到活動、桌遊、排行榜；Draft 不外洩；metadata 維持 Site Settings。

## Phase B：Dashboard 待處理摘要

1. 以既有 membership、events、borrowings 資料計算 attention priority。
2. 新增最小 page-level summary，保留現有明細元件。
3. 補齊無資格、無資料、錯誤狀態。

驗收：會員能在首屏知道是否需簽到、處理借用或補資格；不新增個資暴露。

## Phase C：Admin Overview

1. 先盤點各 repository 是否已有 bounded count/list。
2. 新增待處理 read model 或 service method，所有 query 平行執行。
3. 將既有借用統計改成待辦優先，逐步加入活動／會員／公告入口。

驗收：每個數字有對應管理操作，非管理員仍被 layout/API 擋下，手機可操作。

## 風險與限制

- 目前沒有細分 admin role；不可在前端自行推導權限。
- 公開首頁新增查詢可能影響 cache 與 TTFB，需設定 limit 並監測 query 次數。
- 取消活動與草稿狀態必須沿用既有 Public/Admin API 條件。
- 實際視覺驗收仍需 Browser QA；文件本身不代表已完成 UI。

## 建議驗收清單

- `npx tsc --noEmit`、`npm run lint`、既有 Node/Playwright tests。
- 390px、768px、1280px 的 keyboard/focus、overflow、loading/error/empty。
- SSR metadata 來源與 Site Settings cache invalidation。
- Admin authorization、Public draft privacy、事件取消狀態。
