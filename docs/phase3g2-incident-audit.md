# Phase 3G-2：/admin incident 診斷結案

## 實際查詢鏈

- RootLayout / AdminLayout → getCurrentUser → authService.getUserBySessionToken → SessionRepository.findValidByToken → sessions.select(*)，token + expires_at filter → usersRepository.findById → users.select(*)。
- AdminLayout → isAdminByUserId → usersRepository.findById → officerPositionsService.hasEverBeenOfficer → officer_positions。
- AdminPage → boardGamesService.countAllBoardGames → boardGamesRepository.countAll → board_games exact count。
- AdminPage → countBorrowingsByStatus(pending/approved/borrowed) → boardGameBorrowingsRepository.countByStatus → board_game_borrowings exact count + status。
- AdminPage → countOverdueBorrowings → countByStatus(borrowed, now) → 同表 status=borrowed + due_at<now。
- Page 與 AdminLayout 都使用 route=/admin 的 server-render reporting boundary；route 本身不足以辨識失敗的 operation。

## 2026-09-14 只讀證據（套用前）

Linked project：gcydchpuckbmctcjpokz.supabase.co。migration history 已至 202609130002，202609140001 尚未套用。

- users.select(*) 零列 probe：200。
- users.select(closed_at) 零列 probe：400 / 42703 / column users.closed_at does not exist。
- synthetic 不存在 token 的有效 Session 查詢：200（不讀取真實 Session）。
- 桌遊總數、三種借用 count、overdue count、officer schema：全部 200。

因此確認 migration 尚缺，但不能據此判定本次 /admin incident 為 closed_at schema drift：現行查詢沒有明列該欄位；JS 存取屬性不會發出欄位查詢。未新增缺欄 fallback，也未套 migration。明列缺欄 probe 的 42703 不是歷史 incident 的證據，不可混稱 PGRST204。

兩個待追查 Error ID：bb7433d9-3653-42c4-8528-da05aa8c1f66、12e18d3f-3fb9-426a-8c74-f03aa0ad553a。
沒有可用 Vercel connector、CLI 登入或 project link；GitHub checkpoint combined status 未提供 deployment。無法確認 production deployment commit、事件時間或歷史原始 exception。歷史 root cause = inconclusive，不再等待不可回溯的 cause。當前成功 probe 不代表歷史沒有 transient failure。

## 已修正的診斷缺口

RepositoryError 本來保留 cause/context，資料主要在 report.technicalCause 被省略。PostgREST plain object 通常沒有 name；原 allowlist 便將它標成 UnknownError。

Server reporter 現在輸出 type、code、實際可用 HTTP status、Repository operation，並對已知技術訊息格式輸出安全 message/details/hint。沒有 name 的已知 PostgREST code 可辨識為 PostgrestError；無 code 的 fetch failed 正規化為 FetchError。SDK fetch boundary 在最終 JSON error 保留 HTTP status，不推測 status。

任意 provider 物件、request/body/header/cookie、getter、stack 不序列化。文字有長度/深度限制；只接受已知技術格式，遮蔽網址、憑證、Email、長數字、資料值。未知自由文字與 Key/Failing row 等含資料內容省略；不是保證能安全輸出任意 SQL/provider message 的通用脫敏器。

Production UI/API/digest 仍為安全訊息與 Error ID，client reporter 不使用 Server 診斷資料。相同 exception 僅報一次。不在 Repository 增加 console logging。

PGRST303 predicate 不變：GET/HEAD、401、PGRST303、JWT issued at future，100ms 後一次 retry。Recovered error 不產生 incident；PGRST204/42703 不 retry。

## Migration 與後續

Dry-run 僅列 202609140001_add_account_closure.sql，沒有 seeds/roles 或其他 migration。未遠端套用，未部署、未 commit、未修改真實帳號。

Phase 3G migration 為新增 nullable 欄位與 RPC/guards，舊資料不改寫；正確順序：backward-compatible migration → schema/RPC verification → application deployment。不可因本次未知 incident 就把 migration 宣稱為修復。

Ready for USER remote migration authorization（Phase 3G readiness）。Historical root cause unavailable; observability gap fixed prospectively. 兩筆舊事件不再阻擋開發，也不猜測為 closed_at 問題。若未來有同時段原始 provider log，可另行重啟調查。Session UI 已於 completion 精簡；AccountClosure 與 Board Game form 未修改。

參考：[PostgREST errors](https://docs.postgrest.org/en/v16/references/errors.html)、[Vercel logs](https://vercel.com/docs/cli/logs)。

## Completion：固定 operation context 與 Session UX

RepositoryError 新增可選 OperationContext 字串 union；Server logger 再次做相同 runtime allowlist 檢查。不接受任意 metadata object，不帶 UUID、Email、token、時間戳、search 或 URL。

Dashboard 固定標籤：board-games-total、borrowings-pending、borrowings-approved、borrowings-borrowed、borrowings-overdue。
Auth 固定標籤：session-validity、user-session、admin-guard、officer-history-check；一般 User read 為 user-lookup。
其他 count 保留 returned/rejected/cancelled 及 filtered 模式。operation 保留既有 code-owned Repository 描述，operationContext 區分用途，不改 query 或 retry，不增加重複報告。

Session 保留單一分隔列外框，標題右側為 current success badge 或個別撤銷鍵。移除其他工作階段 badge；metadata 共用日期工具並自然換行。個別與全域撤銷維持 danger、最小 40px 點擊高度，不強制滿版。確認視窗、DELETE API、成功 refresh 不變。

目前服務讀取帳號 Session 清單，本輪未新增分頁，以 3–5 列密度為目標；大量 Session 的分頁／清理不屬本輪。AccountClosure 與 Board Game form 未修改。

人工 QA：桌面、320/375px 檢查 title/badge/action 換行、metadata 可讀、無橫向 overflow、3–5 列密度及全域撤銷與註銷區間距。DOM tests 不代表視覺 PASS。

Completion dry-run 仍只有 202609140001_add_account_closure.sql，無 seeds/roles，未套用。
部署順序：apply migration → verify users.closed_at / close_account RPC / migration history → deploy application → smoke test login/settings/admin。不可用真實帳號註銷作 smoke test。

## 2026-09-14 Final closure：遠端已套用

USER 授權後，dry-run 僅列 `202609140001_add_account_closure.sql`，無 seeds／roles。已使用 Supabase CLI db push 套用至 `gcydchpuckbmctcjpokz`；remote history 已包含 `202609140001`。上文尚未套用／待授權描述為開發當時紀錄，已由本節更新。Application 尚未部署。

Migration SHA-256：`A5A6DBCC3B6F06B4A8CD8C41D3315F1277988A7959647B915FDB477DBE71E994`，本次隔離驗證及 push 前後一致。`closed_at` 為 nullable timestamptz、無 default；RPC signature、SECURITY DEFINER、空 search_path 及 service-role-only execute boundary 通過，anon/authenticated 不可執行。遠端三個函式 body hash 與全新本機 canonical schema 相同。

遷移前後筆數一致：users/profile/credentials 各 19、sessions 33、verification tokens 21、memberships 13、officers 14、borrowings 6、attendance 0、announcements 1、register keys 153。Closed users 為 0。PostgREST 新欄位、active users、officer schema 與 Dashboard counts 皆 200。Schema cache reload not required.

本機 rollback SQL 驗證及並行交易 3/3 通過。未在共享遠端建立假帳號／社員／借用歷史，亦未註銷任何帳號；實際 browser closure round-trip 留待可丟棄帳號人工驗證。USER 已接受 UI，不代表 production browser smoke test 已執行。歷史 incident root cause 仍為 inconclusive。後續順序：deploy application → smoke test login/settings/admin。
