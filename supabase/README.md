# Supabase 資料庫說明

## 這個資料夾是做什麼的？

這裡放和 Supabase 資料庫有關的檔案：目前資料表結構的參考，以及未來資料庫
變更的紀錄。一般網站功能開發時，不需要直接修改這裡的 SQL。

## 檔案怎麼看？

| 位置 | 用途 |
| --- | --- |
| `schema/canonical-public-schema.sql` | 歷史 remote schema 參考；Phase 3E 公告／桌遊／活動欄位已於 2026-09-14 套用並唯讀驗證。 |
| `migrations/` | 未來資料庫結構有變動時，放新 migration 檔案的地方。 |
| `verification/` | 確認資料表結構有沒有建立正確的檢查 SQL。 |

## 接手後平常怎麼做？

1. 平常開發網站不需要執行 schema SQL。
2. 要改資料表時，先和負責資料庫的人確認。
3. 新 migration 只新增，不修改舊檔。
4. 不要把密碼、service-role key、真實會員資料放進 repository。

## 目前要注意的事

目前線上資料庫的舊 migration 紀錄不完整，因此
`canonical-public-schema.sql` 先作為交接與全新資料庫參考；不要直接拿去執行
在線上資料庫。

## 想深入了解

需要重建新資料庫或部署 migration 時，再閱讀 schema 檔並詢問專案維護者。

## Phase 3B：借用刪除功能退場

應用程式已移除管理端借用紀錄的刪除按鈕、DELETE handler、Service 與 Repository 呼叫。
既有 `delete_board_game_borrowing(bigint)` RPC 不再有應用程式呼叫者。
歷史 migration 與對應 verification SQL 保留不改；它們不是目前產品支援刪除操作的證明。

本輪不新增反向或 DROP migration，也未變更遠端資料庫。原 RPC 的歷史授權限於
`service_role`，保留它不會重新開放網站上的刪除 API。若未來要移除遠端函式，應先確認
外部維護腳本沒有使用，再以新的 forward migration 處理；不要修改已套用的歷史 SQL。

## Phase 3E：Rich Content（已套用）

2026-09-14 經 USER 授權，dry-run 僅包含下列兩份後，以 Supabase CLI db push 依序套用：

- `202609130001_add_announcement_rich_content.sql`
- `202609130002_add_rich_descriptions.sql`

目標為 localhost 同時使用的遠端 project `gcydchpuckbmctcjpokz`。
套用後 migration history、欄位、defaults／constraints 與 PostgREST 新欄位查詢皆通過。
公告／桌遊／活動原文字與筆數比對一致，未執行內容 QA mutation，沒有手動 schema-cache reload。
已部署 migration 不再改寫；後續修正新增 migration。回退程式時保留新欄位與資料，不 DROP。

詳見 [Rich Content 最新執行紀錄](../docs/rich-content.md)。canonical snapshot 仍不是可套用線上 DB 的 migration。

## Phase 3G：帳號註銷（套用前紀錄）

新增 `202609140001_add_account_closure.sql`，不修改已部署 migration。遠端 history 已核對到 `202609130002`；本輪 `db push --dry-run` 僅列出此新增檔案，尚未執行遠端 push。

此 migration 新增 `users.closed_at`、原子註銷 RPC 與並行寫入 guard。既有帳號預設維持開啟，不改寫既有個資或歷史。部署應先套用 migration，再上線依賴新欄位與 RPC 的程式。

隔離 PostgreSQL 驗證涵蓋借用 blocker、個資清除、歷史保留、交易 rollback 與三組並行交易。操作與回退限制見 [帳號生命週期](../docs/account-lifecycle.md)。不可用真實帳號代替測試資料；註銷資料無法靠 schema rollback 復原。

## 2026-09-14 Final closure：遠端已套用

USER 授權後，dry-run 僅列 `202609140001_add_account_closure.sql`，無 seeds／roles。已使用 Supabase CLI db push 套用至 `gcydchpuckbmctcjpokz`；remote history 已包含 `202609140001`。上文尚未套用／待授權描述為開發當時紀錄，已由本節更新。Application 尚未部署。

Migration SHA-256：`A5A6DBCC3B6F06B4A8CD8C41D3315F1277988A7959647B915FDB477DBE71E994`，本次隔離驗證及 push 前後一致。`closed_at` 為 nullable timestamptz、無 default；RPC signature、SECURITY DEFINER、空 search_path 及 service-role-only execute boundary 通過，anon/authenticated 不可執行。遠端三個函式 body hash 與全新本機 canonical schema 相同。

遷移前後筆數一致：users/profile/credentials 各 19、sessions 33、verification tokens 21、memberships 13、officers 14、borrowings 6、attendance 0、announcements 1、register keys 153。Closed users 為 0。PostgREST 新欄位、active users、officer schema 與 Dashboard counts 皆 200。Schema cache reload not required.

本機 rollback SQL 驗證及並行交易 3/3 通過。未在共享遠端建立假帳號／社員／借用歷史，亦未註銷任何帳號；實際 browser closure round-trip 留待可丟棄帳號人工驗證。USER 已接受 UI，不代表 production browser smoke test 已執行。歷史 incident root cause 仍為 inconclusive。後續順序：deploy application → smoke test login/settings/admin。
