# Phase 3K-B3：社課 critical path

本輪不部署、不 push、不修改遠端 DB，也不新增 migration / RPC / index。B1/B2 未提交變更保留。

## 量測方法與 baseline

`tests/request-budgets.test.mjs` 使用真正 Supabase SDK、專案 transport、已安裝 Next dedupe fetch 與受控 Data API fixture。先在改動前量到 Dashboard 13、check-in 7、合計 20、borrowings 5，baseline assertion PASS；改成 11/6/17/4 後 RED，實作後 GREEN。最終 Dashboard harness 直接呼叫實際 page，並模擬 layout 的單次 cached current-user 與管理導覽 guard。

這是成功路徑、單一使用者、有 active membership、有開放活動、有借用紀錄、Session 未達 touch 門檻的量測；不是 production HTTP trace 或多人負載測試。失敗 retry、預取、過期 touch、搜尋、零資料分支可能改變數字。

| Flow | Before | After cold | After warm |
| --- | ---: | ---: | ---: |
| Dashboard | 13 reads | 11 reads | 10 reads |
| Check-in API | 6 reads + 1 write | 5 reads + 1 write | 同 cold |
| Check-in + Dashboard refresh（分開兩次 request） | 20 | 17 | 16 |
| Borrowings page（無搜尋） | 5 reads | 4 reads | 4 reads |

暖快取只省公開公告；不快取 Dashboard 的個人資料、簽到、社員資格或借用。Profile 在 B1/B2 的 10 reads 維持 10：原本相同的 current-year HTTP request 已由 Next 去重，不能再把 React memo 算成一次新的節省。

## Dashboard 的 13 筆原始 graph

`authenticated layout / WebsiteShell + Dashboard page → auth、membership、boardGames、events、announcements services → repositories → Data API`

下表均為成功首次 render 所需的查詢；count 的 repository HEAD 由既有 transport 轉為 GET `limit=0`，不另計成第二筆。

| # | Repository / request | 用途與判定 | 本輪處理 / cache |
| --- | --- | --- | --- |
| 1 | SessionRepository.findValidByTokenHash → GET sessions | 登入驗證，必要 | 保留；不可 shared cache |
| 2 | usersRepository.findById → GET users | 使用者／closed guard，必要；重複同 URL 已 Next dedupe | 保留；不可 shared cache |
| 3 | officerPositionsRepository.countByUserId → HEAD officer_positions | 管理導覽，必要 | 保留；不可 shared cache |
| 4 | academicYearsRepository.findMany → GET academic_years | 只使用 current year，整份列表非必要 | 改 current-year request-scoped helper；不可跨 request cache |
| 5 | borrowings.findManyByUserId(borrowed) → GET board_game_borrowings | 期限升冪、limit 3 | 關聯載入 game，移除不用的 exact count |
| 6 | 同上 approved → GET board_game_borrowings | 申請時間升冪、limit 3 | 保留不同排序／上限，關聯載入 game |
| 7 | 同上 pending → GET board_game_borrowings | 申請時間升冪、limit 3 | 保留不同排序／上限，關聯載入 game |
| 8 | boardGames.findManyByIds → GET board_games | selected borrowing 的桌遊補查；無借用時原本可略過 | 移除，以 5–7 的 narrow relation 取得 |
| 9 | announcements.findPublished → GET announcements | 最新三筆公開公告，可 shared cache | 使用 B2 首頁公開 query/cache（30 秒時間窗、發布修改刪除 invalidation） |
| 10 | memberships.findByUserIdAndAcademicYearId → GET memberships | 摘要與 active gate | 保留；無 current year 略過，不 shared cache |
| 11 | academicYears.findById → GET academic_years | 重查 #4 已取得的年度 | 移除，直接傳入可信 Server year |
| 12 | events.findOpenForSelfCheckIn → GET events | 只有 active member 需要 | 保留；select id/name/start_time/end_time，不讀 Rich Content |
| 13 | attendances.findManyByUserIdAndEventIds → GET event_attendances | 已簽到狀態；無活動時原本略過 | 保留；只 select event_id，不讀整列 |

三種借用狀態採 Option B：單一 `status IN (...) + LIMIT` 無法用現有簡單 order 同時保持 borrowed 優先及各組不同時間排序。不新增 CASE order RPC；最多各三筆，再保留原先的組別順序取總共三筆。未擴大成全部歷史。

個人 borrowings 同樣用 narrow relation，維持搜尋 ID 查詢、filters、exact count、分頁、取消功能與 missing game 行為。只改私人卡片的 TypeScript 資料契約，沒有改 JSX layout。

## Current academic year

`services/academic-years/current-academic-year.ts` 是單一 React `cache()` helper。Dashboard、private/public Profile、membership、officer、event helpers 都透過它取得目前學年度。

同一次 RSC render 共用 promise；下一次 render 重新取得。沒有 process-global Map 或 Next shared cache。Route Handler 沒有 React cache dispatcher，不 memo；check-in 的 membership helper 原本也只有一次 current-year lookup，本輪仍一次。不能宣稱 API memo 節省。測試使用已安裝 React server cache 與隔離 dispatcher，驗證同 render 一次、下次 request 年度可改變、非 RSC 不全域快取。

參考：[React cache 的 RSC 範圍](https://react.dev/reference/react/cache)、[Supabase relational projections](https://supabase.com/docs/guides/database/joins-and-nesting)。

## Check-in graph 與競爭

Before：session GET → user GET →（event GET、current-year GET、active memberships GET、existing-attendance GET）→ attendance POST。

After：只移除 existing-attendance GET；保留 verified-account authorization、current active membership、event existence、雙端簽到時間窗。現行產品確實要求當學年度 active membership，沒有改資格政策。POST 永不 generic retry。

`canonical-public-schema.sql` 已有 `event_attendances_event_id_user_id_key UNIQUE(event_id,user_id)`。既有 repository error → 23505 → `SelfCheckInAlreadyCompletedError` → HTTP 409 仍保留。兩次同時送出由 DB 決定勝者；Route/Service/SDK stub regression 驗證一筆 201、一筆 409、一筆 row，不洩漏 DB error。

另於本機 PostgreSQL 18（127.0.0.1:55439）建立專用隔離 fixture table，使用相同 unique key，以兩條連線重疊 INSERT：第一筆 COMMIT，第二筆 23505，最終 count=1。fixture table/schema 已刪除；未碰遠端 DB。這證明 unique constraint 的併發裁決，不冒充 production browser round-trip。

時間窗已關閉時，重送現在先得到「簽到時間已關閉」409，而不先查「已簽到」；兩者都沿用既有 client 的 409 refresh 行為。這個訊息優先順序差異不改資料或資格。網路不明確時不自動重送 POST，刷新後由權威 attendance state 決定。

`CheckInButton` 的 disabled/loading、成功與 409 `router.refresh()` 保持原樣。沒有 optimistic store、React Query 或 SWR。

## Health 與限制

`GET /api/health` 不讀 cookie、不查 user；academic_years select id limit 0，3 秒 abort signal、停用 SDK retry。既有 PGRST303 timing-only transport retry 仍可能額外一次；一般健康查詢一次。只回 app/database，HTTP 200 + no-store；degraded 不帶 schema、exception、Error ID 或 PII。

檢查的是當下 Data API 可達性，不保證特定寫入、Brevo、權限、所有 migration 或業務流程健康。人工少量檢查，不將它掛在每個頁面或高頻輪詢。SDK 既有其他讀取的網路 retry 沒有在本輪調整。

目前尚未進行新 deployment 的 authenticated browser round-trip 或 production event load test；S1 deployment / legacy rotation checkpoint 不變。部署前仍需原有安全部署流程與 QA 授權。

## B3 檔案範圍與驗證

以下 24 個檔案包含本輪 B3 改動；部分同時保留先前 B1/B2 的未提交改動，不代表 working tree 只含 B3。

| 範圍 | 檔案 |
| --- | --- |
| Dashboard 編排 | `src/app/(authenticated)/dashboard/page.tsx` |
| 僅調整卡片輸入型別，JSX 不變 | `src/components/(authenticated)/dashboard/DashboardBorrowingSummary.tsx`、`src/components/(authenticated)/borrowings/BorrowingRecord.tsx` |
| 借用關聯投影與原有排序 | `src/repositories/board-game-borrowings.repository.ts`、`src/services/board-games/board-games.service.ts`、`src/services/board-games/board-games.types.ts` |
| 活動／簽到查詢與摘要型別 | `src/repositories/events.repository.ts`、`src/repositories/event-attendances.repository.ts`、`src/services/events/events.service.ts`、`src/services/events/events.types.ts` |
| 公開公告重用 | `src/services/announcements/announcements.service.ts` |
| 年度共用及呼叫端 | `src/services/academic-years/current-academic-year.ts`、`src/services/memberships/memberships.service.ts`、`src/services/officer-positions/officer-positions.service.ts`、`src/services/profile/profile.service.ts`、`src/services/profile/public-profile-summary.service.ts` |
| Health | `src/app/api/health/route.ts`、`src/repositories/health.repository.ts`、`src/services/health/health.service.ts` |
| Tests | `tests/request-budgets.test.mjs`、`tests/event-readiness.test.mjs`、`tests/phase2ga-dashboard-check-in.test.mjs` |
| 文件 | `docs/operations/event-critical-path.md`、`docs/operations/event-day-runbook.md` |

`GET /api/users/me/borrowings` 共用同一 service，因此也回傳縮小後的卡片 DTO；`{ data }`、分頁欄位、授權與 filters 維持。repo 內目前無 Client 依賴該 GET 的完整借用／桌遊 entity；取消 mutation 使用的借用 ID 保留。Admin 借用明細的完整 entity 不變。

最終驗證：632/632 tests PASS（B1/B2 baseline 622，加 B3 10 tests）、lint PASS、TypeScript PASS、diff check PASS、production dependency audit 0 vulnerabilities。初次 audit 因網路限制失敗，使用允許的 npm registry 連線重跑後成功。沒有改 schema、transport、Session touch 或建立 commit。
