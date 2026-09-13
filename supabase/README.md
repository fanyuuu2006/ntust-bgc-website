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
