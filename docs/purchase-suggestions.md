# 桌遊購入建議

## 範圍與操作

- `/board-games/suggest`：已登入、帳號有效且信箱已驗證者提交；不檢查社員、學年度或職位。
- 使用者端僅有推薦表單與送出結果；本人紀錄頁及查詢服務已移除，推薦清單只在管理後台提供。
- `/admin/board-games/suggests`：沿用現有「曾任幹部」授權，分頁、名稱搜尋、狀態篩選及處理。
- 不提供購入提醒、已讀操作或通知信。
- 同款遊戲由多個人推薦時，由幹部逐筆確認及標記，不使用名稱猜測或自動合併。
- 初始狀態是待評估。幹部可改為已購入或不採納，兩者可互相更正；不重新開啟為待評估。
- 刪除需確認，是軟刪除：所有一般列表隱藏，但內容、建立時間及刪除者仍保留；沒有復原介面或永久刪除入口。

## 規則

新推薦名稱 1–50 Unicode code points，理由 10–200，選填 HTTP/HTTPS URL 最多 100 字元。前後空白不計入字數。JSON 實際位元組上限 16 KiB。純文字呈現，不抓取連結、不提供 HTML 或附件。

新上限由共用 schema 在前端與伺服器強制驗證。已套用的資料庫約束保留原上限以相容既有紀錄，本次未變更資料庫；既有長內容不截短，歷史連結仍使用原安全檢查呈現。

每帳號至少間隔 60 秒，每週最多 3 筆；以臺北時間週一 00:00 起算，已處理或軟刪除均計入。頁面剩餘額度只是提示，權威判斷在資料庫交易。待評估總量不另設上限。

名稱只做空白整理與大小寫統一。同人同名仍待評估（未刪除）或最近 30 天內送出過（含刪除）時拒絕。不是同款桌遊辨識系統，也無法保證內容合理。

## 安全與並發

Route Handler 檢查同 Origin、JSON、實際串流長度與現有授權；Service 再確認 Session。前端不得指定作者、初始狀態、處理人或時間。

推薦列表僅在 Service 確認管理權限後查詢，分頁限量且排除軟刪除；不能套用公開快取。額度查詢固定以 Session 使用者過濾。高權限 Supabase key 繞過 RLS，因此服務端授權是必要的安全邊界。

新表僅給 service_role SELECT，寫入必須經 service_role 專用 SECURITY DEFINER RPC（空 search_path）。低權限角色不能讀表或執行 RPC；service_role 不能直接 INSERT/UPDATE/DELETE。RPC 的 actor 是服務端從 Session 取得，不是瀏覽器指定，也不是 Supabase Auth 的 auth.uid()。

提交先鎖 users row，重新查帳號狀態、重送、額度後才新增；與既有帳號註銷共用相同鎖定順序。同 request_id 同內容只回收件結果，含已刪除者，不回原內容。不同內容重用 ID 回衝突。管理更新使用 row lock + version 防止互蓋。

目前沒有全站分散式「失敗嘗試」限流；成功提交限制由 DB 保證，不能消除重複錯誤請求、多帳號與平台流量耗用。無 CAPTCHA、IP 蒐集、新套件或付費內容審核。幹部仍需人工判斷不當內容。

## Migration 與驗證

新增 `202609300001_add_board_game_purchase_suggestions.sql`。只新增表與函式，不改舊資料、既有授權或註銷流程。**提交 migration 檔案不代表已套用**。遠端套用與部署需要另外授權。

先在獲授權、可丟棄且已具備現有 schema 的本機資料庫套用新 migration，再執行 `supabase/verification/verify-purchase-suggestions.sql`。該檔只接受名稱以 `purchase_suggestions_qa` 開頭的 DB，測試資料在 transaction rollback。並發測試另見 `verify-purchase-suggestions-concurrency.mjs`，只接受明確確認的 loopback QA DB。不使用共享開發或正式環境，也不 reset 任何既有資料庫。

應用檢查：`npm run lint`、`npx tsc --noEmit`、`npm test`、`git diff --check`、`npm run build`。DB 並發不能由 mock 或字串測試取代。人工確認 375px／桌面，普通使用者不能看別人紀錄，歷史幹部可處理、刪除後不退額度。

核對 migration 已存在後才啟用對應應用。購入提醒已從應用移除，包括元件、已讀 API、Service 與 Repository 操作；已套用的歷史 migration、通知欄位與資料庫函式保留相容，管理函式仍會更新舊通知版本，但應用不再讀取或呈現它們。本次未改動資料庫或清除資料。回退應用時可保留新表，不 DROP 或清除建議。保存期限與永久清理另行審查，不能為釋放額度任意刪除紀錄。
